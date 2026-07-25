import { NextRequest, NextResponse } from "next/server";
import { getStripe, hasStripe, priceIdFor } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { isDbConfigured } from "@/lib/queries";
import { type Plan, type BillingPeriod } from "@/lib/constants";
import { getActiveOrgId } from "@/lib/auth";
import type { Organization } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Create a Stripe Checkout session for upgrading to a paid plan, at
 * the requested billing period. Unlimited has no self-serve checkout
 * (contact-only), so it's deliberately excluded from upgradablePlans.
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
  const billingPeriod = (body.billingPeriod as BillingPeriod | undefined) ?? "monthly";
  const upgradablePlans: Plan[] = ["solo", "crew", "outfit"];
  if (!plan || !upgradablePlans.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (billingPeriod !== "monthly" && billingPeriod !== "annual") {
    return NextResponse.json({ error: "Invalid billing period" }, { status: 400 });
  }
  const priceId = priceIdFor(plan, billingPeriod);
  if (!priceId) {
    return NextResponse.json(
      { error: `No Stripe price configured for ${plan} (${billingPeriod})` },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const stripe = getStripe();

  const orgId = await getActiveOrgId();
  if (!orgId) {
    return NextResponse.json(
      { error: "No active organization" },
      { status: 401 }
    );
  }

  let customerId: string | undefined;
  if (isDbConfigured()) {
    const db = createAdminClient();
    const { data: org } = await db
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();
    customerId = (org as Organization)?.stripe_customer_id ?? undefined;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId,
      client_reference_id: orgId,
      success_url: `${appUrl}/settings?upgraded=1`,
      cancel_url: `${appUrl}/settings`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Stripe checkout session creation failed:", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Could not start checkout.",
      },
      { status: 502 }
    );
  }
}
