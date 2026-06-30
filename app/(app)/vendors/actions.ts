"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase-admin";
import { isDbConfigured, recalculateVendorStatus } from "@/lib/queries";
import { getActiveOrgId, getActiveOrg } from "@/lib/auth";
import { planConfig, nextPlan, type PlanConfig } from "@/lib/constants";
import { generateUploadToken } from "@/lib/upload-token";
import { sendEmail, hasResend } from "@/lib/resend";
import { sendSms, hasTwilio } from "@/lib/twilio";
import { vendorUploadRequestEmail } from "@/lib/email-templates";
import type { Certificate } from "@/lib/types";

const vendorSchema = z.object({
  company_name: z.string().trim().min(1, "Company name is required"),
  contact_name: z.string().trim().optional().or(z.literal("")),
  contact_email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  contact_phone: z.string().trim().optional().or(z.literal("")),
  vendor_type: z.string().trim().optional().or(z.literal("")),
});

export type ActionResult =
  | { ok: true; uploadUrl?: string; emailed?: boolean; texted?: boolean }
  | { ok: false; error: string; upgradePlan?: PlanConfig };

function notConfigured(): ActionResult {
  return {
    ok: false,
    error:
      "Database not connected. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable changes.",
  };
}

const NO_ORG: ActionResult = {
  ok: false,
  error: "No active organization. Please sign in and create your org.",
};

export async function createVendor(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!isDbConfigured()) return notConfigured();

  const parsed = vendorSchema.safeParse({
    company_name: formData.get("company_name"),
    contact_name: formData.get("contact_name"),
    contact_email: formData.get("contact_email"),
    contact_phone: formData.get("contact_phone"),
    vendor_type: formData.get("vendor_type"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const org = await getActiveOrg();
  if (!org) return NO_ORG;
  const db = createAdminClient();

  // Enforce the plan's vendor limit on insert.
  const plan = planConfig(org.plan);
  if (plan.vendorLimit !== null) {
    const { count } = await db
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org.id);
    if ((count ?? 0) >= plan.vendorLimit) {
      const upgrade = nextPlan(org.plan);
      return {
        ok: false,
        error: `You've reached the ${plan.name} plan limit of ${plan.vendorLimit} vendors.`,
        upgradePlan: upgrade ?? undefined,
      };
    }
  }

  const { data: vendor, error } = await db
    .from("vendors")
    .insert({
      org_id: org.id,
      company_name: parsed.data.company_name,
      contact_name: parsed.data.contact_name || null,
      contact_email: parsed.data.contact_email || null,
      contact_phone: parsed.data.contact_phone || null,
      vendor_type: parsed.data.vendor_type || null,
      status: "missing",
    })
    .select("id")
    .single();
  if (error || !vendor) return { ok: false, error: error?.message ?? "Could not create vendor" };

  // Create an upload request and immediately notify the vendor.
  const token = generateUploadToken();
  await db.from("upload_requests").insert({
    vendor_id: vendor.id,
    org_id: org.id,
    token,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const uploadUrl = `${appUrl}/upload/${token}`;
  const contactEmail = parsed.data.contact_email;
  const contactPhone = parsed.data.contact_phone;
  const vendorName = parsed.data.contact_name || parsed.data.company_name;

  let emailed = false;
  let texted = false;

  if (contactEmail) {
    const emailContent = vendorUploadRequestEmail({
      orgName: org.name,
      vendorName,
      uploadUrl,
    });
    await sendEmail({ to: contactEmail, ...emailContent });
    emailed = hasResend();
  }

  if (contactPhone) {
    await sendSms({
      to: contactPhone,
      body: `${org.name} needs your Certificate of Insurance. Upload it here: ${uploadUrl}`,
    });
    texted = hasTwilio();
  }

  revalidatePath("/dashboard");
  revalidatePath("/vendors");
  return { ok: true, uploadUrl, emailed, texted };
}

export async function updateVendor(
  id: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!isDbConfigured()) return notConfigured();

  const parsed = vendorSchema.safeParse({
    company_name: formData.get("company_name"),
    contact_name: formData.get("contact_name"),
    contact_email: formData.get("contact_email"),
    vendor_type: formData.get("vendor_type"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const orgId = await getActiveOrgId();
  if (!orgId) return NO_ORG;
  const db = createAdminClient();
  const { error } = await db
    .from("vendors")
    .update({
      company_name: parsed.data.company_name,
      contact_name: parsed.data.contact_name || null,
      contact_email: parsed.data.contact_email || null,
      vendor_type: parsed.data.vendor_type || null,
    })
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/vendors");
  revalidatePath(`/vendors/${id}`);
  return { ok: true };
}

export async function deleteVendor(id: string): Promise<ActionResult> {
  if (!isDbConfigured()) return notConfigured();
  const orgId = await getActiveOrgId();
  if (!orgId) return NO_ORG;
  const db = createAdminClient();
  const { error } = await db
    .from("vendors")
    .delete()
    .eq("id", id)
    .eq("org_id", orgId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/vendors");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Certificate review/edit (Phase 3)
//
// After a COI is parsed, the org reviews the extracted fields and
// corrects anything Textract/Claude got wrong, then saves. Dates and
// coverage feed the vendor status calculation, so we recalc on save.
// ─────────────────────────────────────────────────────────────
const certSchema = z.object({
  insurer_name: z.string().trim().optional().or(z.literal("")),
  policy_number: z.string().trim().optional().or(z.literal("")),
  named_insured: z.string().trim().optional().or(z.literal("")),
  effective_date: z.string().trim().optional().or(z.literal("")),
  expiration_date: z.string().trim().optional().or(z.literal("")),
  coverage_types: z.string().trim().optional().or(z.literal("")),
});

export async function updateCertificate(
  certId: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  if (!isDbConfigured()) return notConfigured();

  const parsed = certSchema.safeParse({
    insurer_name: formData.get("insurer_name"),
    policy_number: formData.get("policy_number"),
    named_insured: formData.get("named_insured"),
    effective_date: formData.get("effective_date"),
    expiration_date: formData.get("expiration_date"),
    coverage_types: formData.get("coverage_types"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const orgId = await getActiveOrgId();
  if (!orgId) return NO_ORG;
  const db = createAdminClient();
  const { data: existing } = await db
    .from("certificates")
    .select("vendor_id")
    .eq("id", certId)
    .eq("org_id", orgId)
    .single();
  if (!existing) return { ok: false, error: "Certificate not found" };

  const coverageTypes = (parsed.data.coverage_types ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const update: Partial<Certificate> = {
    insurer_name: parsed.data.insurer_name || null,
    policy_number: parsed.data.policy_number || null,
    named_insured: parsed.data.named_insured || null,
    effective_date: parsed.data.effective_date || null,
    expiration_date: parsed.data.expiration_date || null,
    coverage_types: coverageTypes,
    additional_insured: formData.get("additional_insured") === "on",
    waiver_of_subrogation: formData.get("waiver_of_subrogation") === "on",
    parse_source: "manual",
  };

  const { error } = await db
    .from("certificates")
    .update(update)
    .eq("id", certId)
    .eq("org_id", orgId);
  if (error) return { ok: false, error: error.message };

  const vendorId = (existing as { vendor_id: string }).vendor_id;
  await recalculateVendorStatus(vendorId);

  revalidatePath("/dashboard");
  revalidatePath("/vendors");
  revalidatePath(`/vendors/${vendorId}`);
  return { ok: true };
}
