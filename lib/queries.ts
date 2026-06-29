// ─────────────────────────────────────────────────────────────
// Server-side data access.
//
// During development (auth deferred to Phase 8) all reads/writes
// are scoped to the hardcoded DEV_ORG_ID and go through the
// service-role admin client. If Supabase is not configured, reads
// fall back to in-memory fixtures so the UI still renders.
// ─────────────────────────────────────────────────────────────
import "server-only";

import { createAdminClient, hasAdminCredentials } from "@/lib/supabase-admin";
import { DEV_ORG_ID } from "@/lib/constants";
import { computeVendorStatus, latestCertificate } from "@/lib/status";
import { FIXTURE_ORG, FIXTURE_VENDORS } from "@/lib/fixtures";
import type {
  Certificate,
  Organization,
  Vendor,
  VendorWithCert,
  AIReview,
} from "@/lib/types";

export function isDbConfigured(): boolean {
  return hasAdminCredentials();
}

/** The active org. In dev this is always the seeded dev org. */
export async function getOrg(): Promise<Organization> {
  if (!isDbConfigured()) return FIXTURE_ORG as Organization;

  const db = createAdminClient();
  const { data, error } = await db
    .from("organizations")
    .select("*")
    .eq("id", DEV_ORG_ID)
    .single();
  if (error || !data) return FIXTURE_ORG as Organization;
  return data as Organization;
}

/**
 * All vendors for the active org, each joined with its latest
 * certificate and that cert's AI review.
 */
export async function getVendorsWithCerts(): Promise<VendorWithCert[]> {
  if (!isDbConfigured()) return FIXTURE_VENDORS;

  const db = createAdminClient();
  const { data: vendors, error } = await db
    .from("vendors")
    .select("*")
    .eq("org_id", DEV_ORG_ID)
    .order("created_at", { ascending: false });
  if (error || !vendors) return [];

  const { data: certs } = await db
    .from("certificates")
    .select("*")
    .eq("org_id", DEV_ORG_ID);

  const { data: reviews } = await db
    .from("ai_reviews")
    .select("*")
    .eq("org_id", DEV_ORG_ID);

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
  const db = createAdminClient();
  const { data } = await db
    .from("vendors")
    .select("*")
    .eq("id", id)
    .eq("org_id", DEV_ORG_ID)
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
  const db = createAdminClient();
  const { data } = await db
    .from("certificates")
    .select("*")
    .eq("vendor_id", vendorId)
    .eq("org_id", DEV_ORG_ID)
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
