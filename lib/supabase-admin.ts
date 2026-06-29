import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. **Bypasses RLS** — only ever import
 * this from server-side code (route handlers, server actions, Edge
 * Functions). Never expose it to the browser.
 *
 * Used for:
 *  - the unauthenticated vendor upload flow (insert certificate via
 *    a valid upload token)
 *  - the daily reminders cron
 *  - the AI review trigger
 *  - dev-mode reads/writes before auth is wired up (Phase 8)
 */
let cached: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** True when the service-role env is configured. */
export function hasAdminCredentials(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
