"use server";

import { z } from "zod";
import { createOrgForCurrentUser } from "@/lib/auth";

const schema = z.object({
  name: z.string().trim().min(1, "Organization name is required"),
  industry_type: z.string().trim().optional().or(z.literal("")),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createOrg(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    industry_type: formData.get("industry_type"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const result = await createOrgForCurrentUser({
    name: parsed.data.name,
    industryType: parsed.data.industry_type || null,
  });
  if (!result.ok) return { ok: false, error: result.error };
  return { ok: true };
}
