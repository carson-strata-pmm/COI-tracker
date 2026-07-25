import "server-only";
import Stripe from "stripe";
import { PLANS, priceIdEnvFor, type Plan, type BillingPeriod } from "@/lib/constants";

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

/** The configured Stripe price id for a plan + billing period, if self-serve. */
export function priceIdFor(plan: Plan, period: BillingPeriod): string | undefined {
  const envVar = priceIdEnvFor(plan, period);
  return envVar ? process.env[envVar] : undefined;
}

/**
 * Maps every configured self-serve price id back to its plan and
 * billing period. Built from env vars at call time rather than
 * hardcoded literals, so it stays correct if prices are ever
 * regenerated in Stripe without a code change.
 */
function priceIdMap(): Map<string, { plan: Plan; billingPeriod: BillingPeriod }> {
  const map = new Map<string, { plan: Plan; billingPeriod: BillingPeriod }>();
  for (const plan of Object.values(PLANS)) {
    if (!plan.pricing) continue;
    const monthlyId = process.env[plan.pricing.monthlyPriceIdEnv];
    const annualId = process.env[plan.pricing.annualPriceIdEnv];
    if (monthlyId) map.set(monthlyId, { plan: plan.id, billingPeriod: "monthly" });
    if (annualId) map.set(annualId, { plan: plan.id, billingPeriod: "annual" });
  }
  return map;
}

/** Resolve a Stripe price id back to plan + billing_period, or null if unrecognized. */
export function resolvePriceId(
  priceId: string | null | undefined
): { plan: Plan; billingPeriod: BillingPeriod } | null {
  if (!priceId) return null;
  return priceIdMap().get(priceId) ?? null;
}
