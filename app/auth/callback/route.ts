import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const runtime = "nodejs";

/**
 * OAuth/magic-link/email-confirmation callback. Exchanges the code
 * for a session cookie, then redirects to `next` (or the dashboard).
 *
 * Cookies are written directly onto the redirect response so they are
 * included in the Set-Cookie headers — using cookies() from next/headers
 * and then returning a new NextResponse.redirect() loses them.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (code && url && anon) {
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

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=callback`);
}
