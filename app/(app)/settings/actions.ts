"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  isDbConfigured,
  upsertCoverageRequirement,
  deleteCoverageRequirement,
  getResolvedRequirements,
} from "@/lib/queries";
import { getActiveOrgId } from "@/lib/auth";
import { triggerAiReview } from "@/lib/ai-review";
import type { Certificate, Organization, Vendor } from "@/lib/types";

const orgSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required"),
  industry_type: z.string().trim().optional().or(z.literal("")),
});

export type ActionResult = { ok: true } | { ok: false; error: string };
export type CoverageActionResult =
  | { ok: true; rereviewed: number }
  | { ok: false; error: string };

export async function updateOrg(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!isDbConfigured()) {
    return {
      ok: false,
      error:
        "Database not connected. Set Supabase credentials to save settings.",
    };
  }

  const parsed = orgSchema.safeParse({
    name: formData.get("name"),
    industry_type: formData.get("industry_type"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const orgId = await getActiveOrgId();
  if (!orgId) {
    return { ok: false, error: "No active organization." };
  }
  const db = createAdminClient();
  const { error } = await db
    .from("organizations")
    .update({
      name: parsed.data.name,
      industry_type: parsed.data.industry_type || null,
    })
    .eq("id", orgId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Coverage requirement actions
// ─────────────────────────────────────────────────────────────

export async function saveCoverageRequirement(
  vendorType: string,
  formData: FormData
): Promise<CoverageActionResult> {
  const values = {
    gl_per_occurrence_min: parseIntOrNull(formData.get("gl_per_occurrence_min")),
    gl_aggregate_min: parseIntOrNull(formData.get("gl_aggregate_min")),
    workers_comp_required: formData.get("workers_comp_required") === "true",
    auto_required: formData.get("auto_required") === "true",
    auto_min: parseIntOrNull(formData.get("auto_min")),
    umbrella_required: formData.get("umbrella_required") === "true",
    umbrella_min: parseIntOrNull(formData.get("umbrella_min")),
    additional_insured_required:
      formData.get("additional_insured_required") === "true",
    waiver_of_subrogation_required:
      formData.get("waiver_of_subrogation_required") === "true",
  };

  const result = await upsertCoverageRequirement(vendorType, values);
  if (!result.ok) return result;

  revalidateCoverageRulePaths();

  const rereviewed = await triggerRereviews(vendorType);
  return { ok: true, rereviewed };
}

export async function resetCoverageRequirement(
  vendorType: string
): Promise<CoverageActionResult> {
  const result = await deleteCoverageRequirement(vendorType);
  if (!result.ok) return result;

  revalidateCoverageRulePaths();

  const rereviewed = await triggerRereviews(vendorType);
  return { ok: true, rereviewed };
}

/**
 * Add a brand-new vendor type, scoped to this org (no system default
 * exists for it). Used by the "+ Add vendor type" control.
 */
export async function addCoverageRequirement(
  vendorTypeInput: string,
  formData: FormData
): Promise<CoverageActionResult> {
  if (!isDbConfigured()) {
    return { ok: false, error: "Database not connected." };
  }

  const vendorType = vendorTypeInput.trim();
  if (!vendorType) {
    return { ok: false, error: "Vendor type name is required." };
  }

  const existing = await getResolvedRequirements();
  if (
    existing.some(
      (r) => r.vendor_type.toLowerCase() === vendorType.toLowerCase()
    )
  ) {
    return { ok: false, error: `"${vendorType}" already exists.` };
  }

  const values = {
    gl_per_occurrence_min: parseIntOrNull(formData.get("gl_per_occurrence_min")),
    gl_aggregate_min: parseIntOrNull(formData.get("gl_aggregate_min")),
    workers_comp_required: formData.get("workers_comp_required") === "true",
    auto_required: formData.get("auto_required") === "true",
    auto_min: parseIntOrNull(formData.get("auto_min")),
    umbrella_required: formData.get("umbrella_required") === "true",
    umbrella_min: parseIntOrNull(formData.get("umbrella_min")),
    additional_insured_required:
      formData.get("additional_insured_required") === "true",
    waiver_of_subrogation_required:
      formData.get("waiver_of_subrogation_required") === "true",
  };

  const result = await upsertCoverageRequirement(vendorType, values);
  if (!result.ok) return result;

  revalidateCoverageRulePaths();
  return { ok: true, rereviewed: 0 };
}

function revalidateCoverageRulePaths() {
  revalidatePath("/vendors/coverage-rules");
  revalidatePath("/vendors");
  revalidatePath("/dashboard");
}

async function triggerRereviews(vendorType: string): Promise<number> {
  if (!isDbConfigured()) return 0;

  const orgId = await getActiveOrgId();
  if (!orgId) return 0;

  const db = createAdminClient();

  const { data: vendors } = await db
    .from("vendors")
    .select("*")
    .eq("org_id", orgId)
    .eq("vendor_type", vendorType);

  if (!vendors || vendors.length === 0) return 0;

  const vendorIds = vendors.map((v) => v.id);

  const { data: allCerts } = await db
    .from("certificates")
    .select("*")
    .eq("org_id", orgId)
    .in("vendor_id", vendorIds)
    .order("uploaded_at", { ascending: false });

  const latestByVendor = new Map<string, Certificate>();
  for (const cert of (allCerts ?? []) as Certificate[]) {
    if (!latestByVendor.has(cert.vendor_id)) {
      latestByVendor.set(cert.vendor_id, cert);
    }
  }

  if (latestByVendor.size === 0) return 0;

  const { data: orgRow } = await db
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();
  if (!orgRow) return 0;

  const results = await Promise.all(
    (vendors as Vendor[])
      .filter((v) => latestByVendor.has(v.id))
      .map((v) =>
        triggerAiReview({
          cert: latestByVendor.get(v.id)!,
          vendor: v,
          org: orgRow as Organization,
        })
      )
  );

  return results.filter((r) => r !== null).length;
}

function parseIntOrNull(val: FormDataEntryValue | null): number | null {
  if (val === null || val === "") return null;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? null : n;
}
