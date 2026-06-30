import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, hasStripe, planForPriceId } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { hasAdminCredentials } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * Stripe webhook. Keeps organizations.plan in sync with subscription
 * lifecycle events. (Phase 9.)
 */
export async function POST(req: NextRequest) {
  if (!hasStripe()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET not set" },
      { status: 503 }
    );
  }

  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig ?? "", secret);
  } catch (e) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${e}` },
      { status: 400 }
    );
  }

  if (!hasAdminCredentials()) {
    return NextResponse.json({ received: true });
  }
  const db = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.client_reference_id;
      if (orgId && session.subscription) {
        const sub = await getStripe().subscriptions.retrieve(
          session.subscription as string
        );
        await syncSubscription(db, orgId, sub, session.customer as string);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = await orgForCustomer(db, sub.customer as string);
      if (orgId) await syncSubscription(db, orgId, sub, sub.customer as string);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const orgId = await orgForCustomer(db, sub.customer as string);
      if (orgId) {
        await db
          .from("organizations")
          .update({ plan: "solo", stripe_subscription_id: null })
          .eq("id", orgId);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

async function orgForCustomer(
  db: ReturnType<typeof createAdminClient>,
  customerId: string
): Promise<string | null> {
  const { data } = await db
    .from("organizations")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.id ?? null;
}

async function syncSubscription(
  db: ReturnType<typeof createAdminClient>,
  orgId: string,
  sub: Stripe.Subscription,
  customerId: string
): Promise<void> {
  const priceId = sub.items.data[0]?.price.id;
  const plan = planForPriceId(priceId);
  await db
    .from("organizations")
    .update({
      plan: sub.status === "active" || sub.status === "trialing" ? plan : "solo",
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
    })
    .eq("id", orgId);
}
