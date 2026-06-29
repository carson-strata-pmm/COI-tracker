"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase-admin";
import { isDbConfigured } from "@/lib/queries";
import { getActiveOrgId } from "@/lib/auth";

const orgSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required"),
  industry_type: z.string().trim().optional().or(z.literal("")),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

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
