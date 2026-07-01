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

  // generateLink registers the user and returns the confirmation URL in one
  // call — no separate signUp needed, which avoids double-registration.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      redirectTo: `${appUrl}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const confirmationUrl = data?.properties?.action_link;
  if (!confirmationUrl) {
    return NextResponse.json(
      { error: "Failed to generate confirmation link." },
      { status: 500 }
    );
  }

  try {
    await sendConfirmationEmail(email, confirmationUrl);
  } catch (err) {
    console.error("Confirmation email failed:", err);
    // Account is created; don't block signup if email fails.
  }

  return NextResponse.json({ ok: true });
}
