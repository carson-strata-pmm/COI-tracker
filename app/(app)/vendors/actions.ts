"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase-admin";
import { isDbConfigured, getOrg } from "@/lib/queries";
import { DEV_ORG_ID, planConfig } from "@/lib/constants";

const vendorSchema = z.object({
  company_name: z.string().trim().min(1, "Company name is required"),
  contact_name: z.string().trim().optional().or(z.literal("")),
  contact_email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  vendor_type: z.string().trim().optional().or(z.literal("")),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

function notConfigured(): ActionResult {
  return {
    ok: false,
    error:
      "Database not connected. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to enable changes.",
  };
}

export async function createVendor(
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

  const db = createAdminClient();

  // Enforce the plan's vendor limit on insert.
  const org = await getOrg();
  const plan = planConfig(org.plan);
  if (plan.vendorLimit !== null) {
    const { count } = await db
      .from("vendors")
      .select("id", { count: "exact", head: true })
      .eq("org_id", DEV_ORG_ID);
    if ((count ?? 0) >= plan.vendorLimit) {
      return {
        ok: false,
        error: `You've reached the ${plan.name} plan limit of ${plan.vendorLimit} vendors. Upgrade to add more.`,
      };
    }
  }

  const { error } = await db.from("vendors").insert({
    org_id: DEV_ORG_ID,
    company_name: parsed.data.company_name,
    contact_name: parsed.data.contact_name || null,
    contact_email: parsed.data.contact_email || null,
    vendor_type: parsed.data.vendor_type || null,
    status: "missing",
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/vendors");
  return { ok: true };
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
    .eq("org_id", DEV_ORG_ID);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/vendors");
  revalidatePath(`/vendors/${id}`);
  return { ok: true };
}

export async function deleteVendor(id: string): Promise<ActionResult> {
  if (!isDbConfigured()) return notConfigured();
  const db = createAdminClient();
  const { error } = await db
    .from("vendors")
    .delete()
    .eq("id", id)
    .eq("org_id", DEV_ORG_ID);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/vendors");
  return { ok: true };
}
