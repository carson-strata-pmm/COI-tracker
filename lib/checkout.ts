import "server-only";
import { getStripe } from "@/lib/stripe";
import { priceIdFor } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase-admin";
import { isDbConfigured } from "@/lib/queries";
import type { BillingPeriod, Plan } from "@/lib/constants";
import type { Organization } from "@/lib/types";

/**
 * Creates a Stripe Checkout session for a self-serve plan upgrade.
 * Shared by the settings/upgrade-modal checkout API route and the
 * signup-with-plan checkout redirect page, so both stay in sync on
 * price resolution, customer lookup, and session shape.
 */
export async function createCheckoutSession(args: {
  orgId: string;
  plan: Plan;
  billingPeriod: BillingPeriod;
  customerEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string } | { error: string }> {
  const priceId = priceIdFor(args.plan, args.billingPeriod);
  if (!priceId) {
    return { error: `No Stripe price configured for ${args.plan} (${args.billingPeriod})` };
  }

  const stripe = getStripe();

  let customerId: string | undefined;
  if (isDbConfigured()) {
    const db = createAdminClient();
    const { data: org } = await db
      .from("organizations")
      .select("*")
      .eq("id", args.orgId)
      .single();
    customerId = (org as Organization)?.stripe_customer_id ?? undefined;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer: customerId,
      customer_email: customerId ? undefined : args.customerEmail ?? undefined,
      client_reference_id: args.orgId,
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: { org_id: args.orgId, plan: args.plan, billing_period: args.billingPeriod },
    });
    if (!session.url) return { error: "Stripe did not return a checkout URL." };
    return { url: session.url };
  } catch (e) {
    console.error("Stripe checkout session creation failed:", e);
    return { error: e instanceof Error ? e.message : "Could not start checkout." };
  }
}
