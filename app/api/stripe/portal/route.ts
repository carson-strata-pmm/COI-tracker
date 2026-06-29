import { NextResponse } from "next/server";
import { getStripe, hasStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { isDbConfigured } from "@/lib/queries";
import { DEV_ORG_ID } from "@/lib/constants";
import type { Organization } from "@/lib/types";

export const runtime = "nodejs";

/** Open the Stripe Customer Portal for self-serve plan management. */
export async function POST() {
  if (!hasStripe() || !isDbConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured." },
      { status: 503 }
    );
  }

  const db = createAdminClient();
  const { data: org } = await db
    .from("organizations")
    .select("*")
    .eq("id", DEV_ORG_ID)
    .single();
  const customerId = (org as Organization)?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json(
      { error: "No Stripe customer on file." },
      { status: 400 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/settings`,
  });

  return NextResponse.json({ url: session.url });
}
