import "server-only";
import Stripe from "stripe";
import { PLANS, type Plan } from "@/lib/constants";

let client: Stripe | null = null;
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Pin to the SDK's default API version to avoid drift.
      apiVersion: "2025-02-24.acacia",
    });
  }
  return client;
}

export function hasStripe(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Map a Stripe price id back to one of our plans. */
export function planForPriceId(priceId: string | null | undefined): Plan {
  if (!priceId) return "solo";
  for (const plan of Object.values(PLANS)) {
    if (process.env[plan.priceIdEnv] === priceId) return plan.id;
  }
  return "solo";
}

/** The configured Stripe price id for a plan. */
export function priceIdForPlan(plan: Plan): string | undefined {
  return process.env[PLANS[plan].priceIdEnv];
}
