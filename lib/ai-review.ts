import "server-only";

import { createAdminClient } from "@/lib/supabase-admin";
import { runComplianceReview, hasAnthropic } from "@/lib/anthropic";
import { formatMoney, humanizeKey } from "@/lib/format";
import type { Certificate, Organization, Vendor } from "@/lib/types";

/**
 * Run an AI compliance review for a certificate and persist it to
 * ai_reviews. Safe to call for any cert; callers gate on the org's
 * plan (Pro+ only). Returns the number of issues found, or null when
 * Anthropic isn't configured.
 */
export async function triggerAiReview(args: {
  cert: Certificate;
  vendor: Vendor;
  org: Organization;
}): Promise<number | null> {
  if (!hasAnthropic()) return null;

  const db = createAdminClient();

  // Seed a pending row so the UI can show "pending" immediately.
  const { data: pending } = await db
    .from("ai_reviews")
    .insert({
      cert_id: args.cert.id,
      org_id: args.org.id,
      status: "pending",
    })
    .select("id")
    .single();

  try {
    const report = await runComplianceReview({
      vendor_type: args.vendor.vendor_type,
      industry_type: args.org.industry_type,
      named_insured: args.cert.named_insured,
      insurer_name: args.cert.insurer_name,
      expiration_date: args.cert.expiration_date,
      coverage_types_and_limits: describeCoverage(args.cert),
      additional_insured: args.cert.additional_insured,
      waiver_of_subrogation: args.cert.waiver_of_subrogation,
    });

    await db
      .from("ai_reviews")
      .update({
        status: "complete",
        issues_found: report.issues_found,
        report,
      })
      .eq("id", pending?.id);

    return report.issues_found;
  } catch (e) {
    console.error("AI review failed:", e);
    if (pending?.id) {
      await db
        .from("ai_reviews")
        .update({ status: "error" })
        .eq("id", pending.id);
    }
    return null;
  }
}

function describeCoverage(cert: Certificate): string {
  const types = (cert.coverage_types ?? []).join(", ") || "unknown";
  const limits = cert.limits
    ? Object.entries(cert.limits)
        .map(([k, v]) => `${humanizeKey(k)}: ${formatMoney(v)}`)
        .join("; ")
    : "unknown";
  return `Types: ${types}. Limits: ${limits}.`;
}
