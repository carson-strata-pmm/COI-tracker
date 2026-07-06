import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * Email confirmation landing route. Verifies the OTP token hash
 * directly against the Supabase Auth API (server-side, via
 * verifyOtp) and writes the resulting session cookies onto the
 * redirect response.
 *
 * Unlike Supabase's own hosted /auth/v1/verify redirect (used by
 * generateLink's action_link), this never leaves our domain, so it
 * doesn't depend on the project's Site URL / Redirect URL allowlist,
 * and it never falls back to an implicit-flow hash-fragment token.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (token_hash && type && url && anon) {
    const response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Record<string, unknown>;
          }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(
              name,
              value,
              options as Parameters<typeof response.cookies.set>[2]
            )
          );
        },
      },
    });

    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=callback`);
}
