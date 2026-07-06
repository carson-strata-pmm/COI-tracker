import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendConfirmationEmail } from "@/lib/emails/sendConfirmationEmail";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  const admin = createAdminClient();

  // generateLink registers the user and returns a token hash in one
  // call — no separate signUp needed, which avoids double-registration.
  //
  // We build our own confirmation URL from properties.hashed_token
  // rather than using properties.action_link: action_link points to
  // Supabase's own hosted /auth/v1/verify redirect, which uses an
  // implicit-flow hash-fragment token and falls back to the project's
  // Site URL if redirectTo isn't in the allowed list. Verifying the
  // token hash ourselves in /auth/confirm avoids both problems.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const tokenHash = data?.properties?.hashed_token;
  if (!tokenHash) {
    return NextResponse.json(
      { error: "Failed to generate confirmation link." },
      { status: 500 }
    );
  }

  const confirmationUrl = `${appUrl}/auth/confirm?token_hash=${tokenHash}&type=signup&next=${encodeURIComponent(
    "/onboarding"
  )}`;

  try {
    await sendConfirmationEmail(email, confirmationUrl);
  } catch (err) {
    console.error("Confirmation email failed:", err);
    // Account is created; don't block signup if email fails.
  }

  return NextResponse.json({ ok: true });
}
