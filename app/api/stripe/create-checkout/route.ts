import { NextRequest, NextResponse } from "next/server";
import { getStripe, hasStripe, priceIdForPlan } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { isDbConfigured } from "@/lib/queries";
import { DEV_ORG_ID, type Plan } from "@/lib/constants";
import type { Organization } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Create a Stripe Checkout session for upgrading to Pro or Pro+.
 * (Phase 9.)
 */
export async function POST(req: NextRequest) {
  if (!hasStripe()) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const plan = body.plan as Plan | undefined;
  if (plan !== "pro" && plan !== "pro_plus") {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  const priceId = priceIdForPlan(plan);
  if (!priceId) {
    return NextResponse.json(
      { error: `No Stripe price configured for ${plan}` },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const stripe = getStripe();

  let customerId: string | undefined;
  if (isDbConfigured()) {
    const db = createAdminClient();
    const { data: org } = await db
      .from("organizations")
      .select("*")
      .eq("id", DEV_ORG_ID)
      .single();
    customerId = (org as Organization)?.stripe_customer_id ?? undefined;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer: customerId,
    client_reference_id: DEV_ORG_ID,
    success_url: `${appUrl}/settings?upgraded=1`,
    cancel_url: `${appUrl}/settings`,
  });

  return NextResponse.json({ url: session.url });
}
