import { NextRequest, NextResponse } from "next/server";
import { hasStripe } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/checkout";
import { isBillingPeriod, isSelfServePlan } from "@/lib/constants";
import { getActiveOrgId } from "@/lib/auth";

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
  const plan = body.plan;
  const billingPeriod = body.billingPeriod ?? "monthly";
  if (!isSelfServePlan(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (!isBillingPeriod(billingPeriod)) {
    return NextResponse.json({ error: "Invalid billing period" }, { status: 400 });
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const orgId = await getActiveOrgId();
  if (!orgId) {
    return NextResponse.json(
      { error: "No active organization" },
      { status: 401 }
    );
  }

  const result = await createCheckoutSession({
    orgId,
    plan,
    billingPeriod,
    successUrl: `${appUrl}/settings?upgraded=1`,
    cancelUrl: `${appUrl}/settings`,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ url: result.url });
}
