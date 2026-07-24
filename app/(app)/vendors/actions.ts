"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase-admin";
import { isDbConfigured, recalculateVendorStatus } from "@/lib/queries";
import { getActiveOrgId, getActiveOrg } from "@/lib/auth";
import { planConfig } from "@/lib/constants";
import { generateUploadToken } from "@/lib/upload-token";
import { sendEmail, hasResend } from "@/lib/resend";
import { sendSms, hasTwilio } from "@/lib/twilio";
import { vendorUploadRequestEmail, issueNotificationEmail } from "@/lib/email-templates";
import { issueNotificationSms } from "@/lib/sms-templates";
import { getFailedChecks } from "@/lib/ai-review-format";
import type { AIReview, Certificate, Organization, Vendor } from "@/lib/types";

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
  vendor_type_notes: z
    .string()
    .trim()
    .max(100, "Keep it under 100 characters")
    .optional()
    .or(z.literal("")),
});

export type ActionResult =
  | { ok: true; uploadUrl?: string; emailed?: boolean; texted?: boolean }
  | { ok: false; error: string; atLimit?: boolean };

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
    vendor_type_notes: formData.get("vendor_type_notes"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const org = await getActiveOrg();
  if (!org) return NO_ORG;
  const db = createAdminClient();

  // Enforce the plan's vendor limit on insert. The UI pre-checks this
  // before the form even opens (see AddVendorDialog); this is the
  // safety net for a race (e.g. two tabs adding at once).
  const plan = planConfig(org.plan);
  if (plan.vendorLimit !== null) {
    const { count } = await db
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org.id);
    if ((count ?? 0) >= plan.vendorLimit) {
      return {
        ok: false,
        error: `You've reached the ${plan.name} plan limit of ${plan.vendorLimit} contractors.`,
        atLimit: true,
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
      vendor_type_notes:
        parsed.data.vendor_type === "Other" ? parsed.data.vendor_type_notes || null : null,
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
    vendor_type_notes: formData.get("vendor_type_notes"),
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
      vendor_type_notes:
        parsed.data.vendor_type === "Other" ? parsed.data.vendor_type_notes || null : null,
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

// ─────────────────────────────────────────────────────────────
// Notify vendor (AI review issues)
// ─────────────────────────────────────────────────────────────

export type NotifyVendorResult =
  | { ok: true; emailed: boolean; texted: boolean; sentTo: string | null }
  | { ok: false; error: string };

/**
 * Sends the vendor a plain-language summary of their AI review
 * issues (email + SMS if a phone is on file), with a fresh upload
 * link, and logs the send to vendor_notifications.
 */
export async function notifyVendor(
  vendorId: string,
  certId: string,
  aiReviewId: string
): Promise<NotifyVendorResult> {
  if (!isDbConfigured()) {
    return {
      ok: false,
      error: "Database not connected. Set Supabase credentials to enable notifications.",
    };
  }

  const orgId = await getActiveOrgId();
  if (!orgId) return { ok: false, error: "No active organization." };

  const db = createAdminClient();

  const [{ data: vendor }, { data: org }, { data: review }] = await Promise.all([
    db.from("vendors").select("*").eq("id", vendorId).eq("org_id", orgId).single(),
    db.from("organizations").select("*").eq("id", orgId).single(),
    db.from("ai_reviews").select("*").eq("id", aiReviewId).eq("org_id", orgId).single(),
  ]);

  if (!vendor) return { ok: false, error: "Contractor not found" };
  if (!org) return { ok: false, error: "Organization not found" };
  if (!review) return { ok: false, error: "AI review not found" };

  const v = vendor as Vendor;
  const o = org as Organization;
  const r = review as AIReview;

  const failedChecks = getFailedChecks(r.report);
  if (failedChecks.length === 0) {
    return { ok: false, error: "No issues to send for this review." };
  }

  // Fresh single-use upload link, same as "Request COI".
  const token = generateUploadToken();
  const { data: uploadRequest, error: tokenError } = await db
    .from("upload_requests")
    .insert({ vendor_id: vendorId, org_id: orgId, token })
    .select("id")
    .single();
  if (tokenError || !uploadRequest) {
    return { ok: false, error: tokenError?.message ?? "Could not create upload link" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const uploadUrl = `${appUrl}/upload/${token}`;

  const sentVia: ("email" | "sms")[] = [];

  if (v.contact_email && hasResend()) {
    const email = issueNotificationEmail({
      vendorName: v.contact_name ?? v.company_name,
      orgName: o.name,
      issues: failedChecks,
      uploadUrl,
    });
    await sendEmail({ to: v.contact_email, ...email });
    sentVia.push("email");
  }

  if (v.contact_phone && hasTwilio()) {
    const body = issueNotificationSms({
      vendorName: v.contact_name ?? v.company_name,
      orgName: o.name,
      issueCount: failedChecks.length,
      uploadUrl,
    });
    await sendSms({ to: v.contact_phone, body });
    sentVia.push("sms");
  }

  await db.from("vendor_notifications").insert({
    vendor_id: vendorId,
    org_id: orgId,
    cert_id: certId,
    ai_review_id: aiReviewId,
    upload_request_id: (uploadRequest as { id: string }).id,
    issues_sent: failedChecks,
    sent_via: sentVia,
  });

  revalidatePath(`/vendors/${vendorId}`);
  revalidatePath("/vendors");
  revalidatePath("/dashboard");

  return { ok: true, emailed: sentVia.includes("email"), texted: sentVia.includes("sms"), sentTo: v.contact_email };
}

// ─────────────────────────────────────────────────────────────
// Bulk vendor import (CSV)
// ─────────────────────────────────────────────────────────────

export interface BulkVendorRow {
  company_name: string;
  vendor_type: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

export type BulkAddResult =
  | { ok: true; inserted: number; skipped: number }
  | { ok: false; error: string };

/**
 * Bulk-inserts pre-validated CSV rows in a single insert. The org is
 * always resolved from the authenticated session, never a client-
 * supplied id, so a caller can't write vendors into another org.
 * Re-checks the plan limit server-side (client validation isn't
 * trusted) — if the batch would exceed it, only the rows that fit are
 * inserted and the rest are reported as skipped.
 */
export async function bulkAddVendors(
  rows: BulkVendorRow[]
): Promise<BulkAddResult> {
  if (!isDbConfigured()) {
    return {
      ok: false,
      error: "Database not connected. Set Supabase credentials to enable imports.",
    };
  }
  if (rows.length === 0) {
    return { ok: false, error: "No rows to import." };
  }

  const org = await getActiveOrg();
  if (!org) return { ok: false, error: "No active organization." };

  const db = createAdminClient();

  const plan = planConfig(org.plan);
  let toInsert = rows;
  let skipped = 0;
  if (plan.vendorLimit !== null) {
    const { count } = await db
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("org_id", org.id);
    const availableSlots = Math.max(0, plan.vendorLimit - (count ?? 0));
    if (rows.length > availableSlots) {
      toInsert = rows.slice(0, availableSlots);
      skipped = rows.length - toInsert.length;
    }
  }

  if (toInsert.length === 0) {
    return {
      ok: false,
      error: `Your ${plan.name} plan is already at its ${plan.vendorLimit}-contractor limit.`,
    };
  }

  const { error } = await db.from("vendors").insert(
    toInsert.map((r) => ({
      org_id: org.id,
      company_name: r.company_name,
      vendor_type: r.vendor_type,
      contact_name: r.contact_name,
      contact_email: r.contact_email,
      contact_phone: r.contact_phone,
      status: "missing",
    }))
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/vendors");

  return { ok: true, inserted: toInsert.length, skipped };
}
