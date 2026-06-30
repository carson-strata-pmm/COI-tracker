import "server-only";

import type { User } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase";
import { createAdminClient, hasAdminCredentials } from "@/lib/supabase-admin";
import { DEV_ORG_ID } from "@/lib/constants";
import type { Organization } from "@/lib/types";

// ─────────────────────────────────────────────────────────────
// Auth + active-org resolution (Phase 8).
//
// The app supports two modes:
//   - dev/demo (default): no login required. The active org is the
//     hardcoded DEV_ORG_ID so the dashboard works out of the box.
//   - enforced (NEXT_PUBLIC_REQUIRE_AUTH=true): users must sign in;
//     the active org is the one recorded for the authenticated user
//     in the `users` table.
//
// Either way, all data access is scoped to the resolved org id, so
// turning enforcement on is a config change, not a code change.
// ─────────────────────────────────────────────────────────────

export const REQUIRE_AUTH = process.env.NEXT_PUBLIC_REQUIRE_AUTH === "true";

/** The current Supabase auth user, or null when not signed in. */
export async function getAuthUser(): Promise<User | null> {
  if (!hasAdminCredentials()) return null;
  try {
    const supabase = createServerSupabase();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  } catch {
    return null;
  }
}

/**
 * The active org id for the current request.
 *   - signed in  → the user's org_id (null if they haven't created
 *                  an org yet — caller should route to onboarding)
 *   - signed out → DEV_ORG_ID in dev, or null when auth is enforced
 */
export async function getActiveOrgId(): Promise<string | null> {
  const user = await getAuthUser();

  if (user) {
    if (!hasAdminCredentials()) return null;
    const db = createAdminClient();
    const { data } = await db
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle();
    return data?.org_id ?? null;
  }

  return REQUIRE_AUTH ? null : DEV_ORG_ID;
}

/** The active org row, or null. */
export async function getActiveOrg(): Promise<Organization | null> {
  if (!hasAdminCredentials()) return null;
  const orgId = await getActiveOrgId();
  if (!orgId) return null;
  const db = createAdminClient();
  const { data } = await db
    .from("organizations")
    .select("*")
    .eq("id", orgId)
    .maybeSingle();
  return (data as Organization) ?? null;
}

/**
 * Ensure a `users` row exists for the authenticated user, then
 * create their organization and link it. Returns the new org id.
 * Used by the onboarding flow on first login.
 */
export async function createOrgForCurrentUser(args: {
  name: string;
  industryType: string | null;
}): Promise<{ ok: true; orgId: string } | { ok: false; error: string }> {
  const user = await getAuthUser();
  if (!user) return { ok: false, error: "Not signed in" };
  if (!hasAdminCredentials()) {
    return { ok: false, error: "Database not configured" };
  }

  const db = createAdminClient();

  const { data: org, error: orgError } = await db
    .from("organizations")
    .insert({ name: args.name, industry_type: args.industryType, plan: "starter" })
    .select("id")
    .single();
  if (orgError || !org) {
    return { ok: false, error: orgError?.message ?? "Could not create org" };
  }

  const { error: userError } = await db.from("users").upsert({
    id: user.id,
    org_id: org.id,
    email: user.email ?? "",
    role: "admin",
  });
  if (userError) {
    return { ok: false, error: userError.message };
  }

  return { ok: true, orgId: org.id };
}
