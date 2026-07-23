import "server-only";

import { createAdminClient } from "@/lib/supabase-admin";
import { recalculateVendorStatus } from "@/lib/queries";
import { runComplianceReview, hasAnthropic } from "@/lib/anthropic";
import type { Certificate, CoverageRequirement, Organization, Vendor } from "@/lib/types";

/**
 * Run an AI compliance review for a certificate and persist it to
 * ai_reviews. Returns the number of issues found, or null when
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
    const requirements = await resolveRequirements(
      args.org.id,
      args.vendor.vendor_type
    );
    const certDetails = extractCertDetails(args.cert);

    const report = await runComplianceReview({
      vendor_type: args.vendor.vendor_type,
      org_name: args.org.name,
      vendor_company_name: args.vendor.company_name,
      named_insured: args.cert.named_insured,
      insurer_name: args.cert.insurer_name,
      expiration_date: args.cert.expiration_date,
      additional_insured: args.cert.additional_insured,
      waiver_of_subrogation: args.cert.waiver_of_subrogation,
      requirements,
      ...certDetails,
    });

    await db
      .from("ai_reviews")
      .update({
        status: "complete",
        issues_found: report.issues_found,
        report,
      })
      .eq("id", pending?.id);

    // Vendor status was set to "pending_review" when the cert was
    // ingested — now that the review has an outcome, refresh it so
    // the dashboard reflects any issues instead of a stale status.
    await recalculateVendorStatus(args.vendor.id);

    return report.issues_found;
  } catch (e) {
    console.error("AI review failed:", e);
    if (pending?.id) {
      await db
        .from("ai_reviews")
        .update({ status: "error" })
        .eq("id", pending.id);
    }
    await recalculateVendorStatus(args.vendor.id);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Requirements resolution
// ─────────────────────────────────────────────────────────────

async function resolveRequirements(
  orgId: string,
  vendorType: string | null
): Promise<CoverageRequirement | null> {
  if (!vendorType) return null;
  const db = createAdminClient();

  // Org override takes priority.
  const { data: override } = await db
    .from("coverage_requirements")
    .select("*")
    .eq("org_id", orgId)
    .eq("vendor_type", vendorType)
    .maybeSingle();
  if (override) return override as CoverageRequirement;

  // Fall back to system default.
  const { data: def } = await db
    .from("coverage_requirements")
    .select("*")
    .is("org_id", null)
    .eq("vendor_type", vendorType)
    .maybeSingle();
  return (def as CoverageRequirement) ?? null;
}

// ─────────────────────────────────────────────────────────────
// Certificate detail extraction
// ─────────────────────────────────────────────────────────────

function getLimit(
  limits: Record<string, number | string> | null,
  ...patterns: string[]
): number | null {
  if (!limits) return null;
  for (const [key, val] of Object.entries(limits)) {
    const norm = key.toLowerCase().replace(/[\s-]/g, "_");
    if (patterns.some((p) => norm.includes(p))) {
      const n = Number(val);
      return isNaN(n) ? null : n;
    }
  }
  return null;
}

function hasCoverageType(
  types: string[] | null,
  ...patterns: string[]
): boolean {
  if (!types) return false;
  return types.some((t) =>
    patterns.some((p) => t.toLowerCase().includes(p.toLowerCase()))
  );
}

function extractCertDetails(cert: Certificate) {
  const limits = cert.limits;
  const types = cert.coverage_types;

  return {
    gl_per_occurrence: getLimit(
      limits,
      "each_occurrence",
      "per_occurrence",
      "occurrence"
    ),
    gl_aggregate: getLimit(limits, "aggregate"),
    workers_comp_detected: hasCoverageType(
      types,
      "workers",
      "comp",
      "compensation"
    ),
    auto_limit: getLimit(limits, "auto"),
    umbrella_limit: getLimit(limits, "umbrella", "excess"),
  };
}
