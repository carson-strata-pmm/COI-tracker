import "server-only";

import { redirect } from "next/navigation";
import { getOrg } from "@/lib/queries";
import { getAuthUser } from "@/lib/auth";
import type { Organization } from "@/lib/types";

/**
 * Resolve the active org for an authenticated app page, or redirect:
 *   - signed in without an org  → /onboarding
 *   - not signed in             → /auth/login
 *
 * In dev/demo mode (no Supabase configured) getOrg() returns the
 * fixture org, so this never redirects.
 */
export async function requireActiveOrg(): Promise<Organization> {
  const org = await getOrg();
  if (org) return org;

  const user = await getAuthUser();
  if (user) redirect("/onboarding");
  redirect("/auth/login");
}
