// ─────────────────────────────────────────────────────────────
// Server-side data access.
//
// All reads/writes are scoped to the active org (see lib/auth.ts):
// the signed-in user's org, or the hardcoded DEV_ORG_ID in dev/demo
// mode. Data access goes through the service-role admin client,
// scoped explicitly by the resolved org id. If Supabase is not
// configured, reads fall back to in-memory fixtures so the UI still
// renders.
// ─────────────────────────────────────────────────────────────
import "server-only";

import { createAdminClient, hasAdminCredentials } from "@/lib/supabase-admin";
import { getActiveOrgId } from "@/lib/auth";
import { computeVendorStatus, latestCertificate } from "@/lib/status";
import { FIXTURE_ORG, FIXTURE_VENDORS } from "@/lib/fixtures";
import { VENDOR_TYPES, getVendorTypesForIndustry } from "@/lib/vendor-types";
import type {
  Certificate,
  CoverageRequirement,
  Organization,
  ResolvedRequirement,
  Vendor,
  VendorWithCert,
  AIReview,
} from "@/lib/types";

export function isDbConfigured(): boolean {
  return hasAdminCredentials();
}

/** The active org. Falls back to the fixture org in demo mode. */
export async function getOrg(): Promise<Organization | null> {
  if (!isDbConfigured()) return FIXTURE_ORG as Organization;

  const orgId = await getActiveOrgId();
  if (!orgId) return null;

  const db = createAdminClient();
  const { data, error } = await db
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .single();
  if (error || !data) return null;
  return data as Organization;
}

/**
 * All vendors for the active org, each joined with its latest
 * certificate and that cert's AI review.
 */
export async function getVendorsWithCerts(): Promise<VendorWithCert[]> {
  if (!isDbConfigured()) return FIXTURE_VENDORS;

  const orgId = await getActiveOrgId();
  if (!orgId) return [];

  const db = createAdminClient();
  const { data: vendors, error } = await db
    .from("vendors")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error || !vendors) return [];

  const { data: certs } = await db
    .from("certificates")
    .select("*")
    .eq("org_id", orgId);

  const { data: reviews } = await db
    .from("ai_reviews")
    .select("*")
    .eq("org_id", orgId);

  const certsByVendor = new Map<string, Certificate[]>();
  for (const c of (certs ?? []) as Certificate[]) {
    const list = certsByVendor.get(c.vendor_id) ?? [];
    list.push(c);
    certsByVendor.set(c.vendor_id, list);
  }
  const reviewByCert = new Map<string, AIReview>();
  for (const r of (reviews ?? []) as AIReview[]) {
    reviewByCert.set(r.cert_id, r);
  }

  return (vendors as Vendor[]).map((v) => {
    const vendorCerts = certsByVendor.get(v.id) ?? [];
    const latest = latestCertificate(vendorCerts);
    return {
      ...v,
      latest_certificate: latest,
      latest_ai_review: latest ? reviewByCert.get(latest.id) ?? null : null,
    };
  });
}

export async function getVendor(id: string): Promise<Vendor | null> {
  if (!isDbConfigured()) {
    return FIXTURE_VENDORS.find((v) => v.id === id) ?? null;
  }
  const orgId = await getActiveOrgId();
  if (!orgId) return null;

  const db = createAdminClient();
  const { data } = await db
    .from("vendors")
    .select("*")
    .eq("id", id)
    .eq("org_id", orgId)
    .single();
  return (data as Vendor) ?? null;
}

export async function getVendorCertificates(
  vendorId: string
): Promise<Certificate[]> {
  if (!isDbConfigured()) {
    const v = FIXTURE_VENDORS.find((x) => x.id === vendorId);
    return v?.latest_certificate ? [v.latest_certificate] : [];
  }
  const orgId = await getActiveOrgId();
  if (!orgId) return [];

  const db = createAdminClient();
  const { data } = await db
    .from("certificates")
    .select("*")
    .eq("vendor_id", vendorId)
    .eq("org_id", orgId)
    .order("uploaded_at", { ascending: false });
  return (data as Certificate[]) ?? [];
}

export async function getAIReviewForCert(
  certId: string
): Promise<AIReview | null> {
  if (!isDbConfigured()) {
    for (const v of FIXTURE_VENDORS) {
      if (v.latest_ai_review?.cert_id === certId) return v.latest_ai_review;
    }
    return null;
  }
  const db = createAdminClient();
  const { data } = await db
    .from("ai_reviews")
    .select("*")
    .eq("cert_id", certId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as AIReview) ?? null;
}

/**
 * Recompute and persist a vendor's status from its certificates.
 * Called after every cert insert/update and by the daily cron.
 */
export async function recalculateVendorStatus(
  vendorId: string
): Promise<void> {
  if (!isDbConfigured()) return;
  const db = createAdminClient();
  const { data: certs } = await db
    .from("certificates")
    .select("*")
    .eq("vendor_id", vendorId);
  const status = computeVendorStatus((certs as Certificate[]) ?? []);
  await db.from("vendors").update({ status }).eq("id", vendorId);
}

// ─────────────────────────────────────────────────────────────
// Coverage requirements
// ─────────────────────────────────────────────────────────────

/**
 * Returns vendor types relevant to the org's industry (from system
 * defaults), merged with any org-specific overrides. Also includes any
 * vendor type the org has added itself (via "+ Add vendor type") that
 * has no system default, and any vendor type the org has customized
 * even if it falls outside their industry's default set — so nothing
 * an org has already configured silently disappears.
 */
export async function getResolvedRequirements(): Promise<ResolvedRequirement[]> {
  if (!isDbConfigured()) return [];

  const orgId = await getActiveOrgId();
  const db = createAdminClient();

  const [{ data: defaults }, { data: overrides }, { data: orgRow }] =
    await Promise.all([
      db
        .from("coverage_requirements")
        .select("*")
        .is("org_id", null)
        .order("vendor_type"),
      orgId
        ? db.from("coverage_requirements").select("*").eq("org_id", orgId)
        : Promise.resolve({ data: [] }),
      orgId
        ? db
            .from("organizations")
            .select("industry_type")
            .eq("id", orgId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const overrideMap = new Map(
    ((overrides ?? []) as CoverageRequirement[]).map((r) => [r.vendor_type, r])
  );
  const relevantTypes = new Set(
    getVendorTypesForIndustry(
      (orgRow as { industry_type: string | null } | null)?.industry_type
    )
  );
  const defaultRows = (defaults ?? []) as CoverageRequirement[];

  const resolved: ResolvedRequirement[] = [];

  for (const d of defaultRows) {
    const override = overrideMap.get(d.vendor_type);
    if (!relevantTypes.has(d.vendor_type) && !override) continue;
    resolved.push(
      override
        ? { ...(override as CoverageRequirement), hasCustomOverride: true, isCustomVendorType: false }
        : { ...d, hasCustomOverride: false, isCustomVendorType: false }
    );
  }

  const defaultTypes = new Set(defaultRows.map((d) => d.vendor_type));
  Array.from(overrideMap.values()).forEach((override) => {
    if (!defaultTypes.has(override.vendor_type)) {
      resolved.push({ ...override, hasCustomOverride: true, isCustomVendorType: true });
    }
  });

  resolved.sort((a, b) => a.vendor_type.localeCompare(b.vendor_type));
  return resolved;
}

/**
 * Vendor type names available to the active org for the "Vendor type"
 * picker when adding/editing a vendor — the same industry-filtered +
 * custom list shown in Coverage Rules, so every selectable type has a
 * visible, editable coverage rule. Falls back to the full static list
 * in demo mode (no DB configured).
 */
export async function getVendorTypeOptions(): Promise<string[]> {
  if (!isDbConfigured()) return [...VENDOR_TYPES];
  const requirements = await getResolvedRequirements();
  return requirements.map((r) => r.vendor_type);
}

/**
 * Upsert a custom override for the active org. Returns the saved row.
 */
export async function upsertCoverageRequirement(
  vendorType: string,
  values: Omit<CoverageRequirement, "id" | "org_id" | "vendor_type" | "created_at" | "is_custom">
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isDbConfigured()) return { ok: false, error: "Database not configured" };
  const orgId = await getActiveOrgId();
  if (!orgId) return { ok: false, error: "No active org" };

  const db = createAdminClient();
  const { error } = await db.from("coverage_requirements").upsert(
    { org_id: orgId, vendor_type: vendorType, is_custom: true, ...values },
    { onConflict: "org_id,vendor_type" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Delete the org's custom override for a vendor type, reverting to the
 * system default.
 */
export async function deleteCoverageRequirement(
  vendorType: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isDbConfigured()) return { ok: false, error: "Database not configured" };
  const orgId = await getActiveOrgId();
  if (!orgId) return { ok: false, error: "No active org" };

  const db = createAdminClient();
  const { error } = await db
    .from("coverage_requirements")
    .delete()
    .eq("org_id", orgId)
    .eq("vendor_type", vendorType);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Count vendors of a given type that have a certificate on file.
 * Used to report how many certs will be re-reviewed after a
 * requirement change.
 */
export async function countVendorsWithCerts(
  vendorType: string
): Promise<number> {
  if (!isDbConfigured()) return 0;
  const orgId = await getActiveOrgId();
  if (!orgId) return 0;

  const db = createAdminClient();
  const { data: vendors } = await db
    .from("vendors")
    .select("id")
    .eq("org_id", orgId)
    .eq("vendor_type", vendorType);

  if (!vendors || vendors.length === 0) return 0;

  const vendorIds = vendors.map((v) => v.id);
  const { count } = await db
    .from("certificates")
    .select("vendor_id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .in("vendor_id", vendorIds);

  return count ?? 0;
}
