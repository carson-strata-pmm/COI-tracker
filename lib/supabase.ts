import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser (client component) Supabase client. Uses the anon key and
 * is subject to RLS as the logged-in user.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Server (RSC / route handler / server action) Supabase client.
 * Reads the session from cookies and is subject to RLS.
 *
 * Note: in Next 14 RSCs cannot set cookies; the no-op setters keep
 * the SSR client happy. Session refresh happens in middleware /
 * route handlers where cookies are writable.
 */
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — safe to ignore.
        }
      },
    },
  });
}
