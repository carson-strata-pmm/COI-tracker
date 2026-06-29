"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase-admin";
import { isDbConfigured } from "@/lib/queries";
import { DEV_ORG_ID } from "@/lib/constants";

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

  const db = createAdminClient();
  const { error } = await db
    .from("organizations")
    .update({
      name: parsed.data.name,
      industry_type: parsed.data.industry_type || null,
    })
    .eq("id", DEV_ORG_ID);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}
