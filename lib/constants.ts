// ─────────────────────────────────────────────────────────────
// Plans — monthly + annual billing, AI review on all plans.
// Unlimited is contact-only (no Stripe price, no self-serve
// checkout) — existing orgs on it are left alone, but it's excluded
// from PAID_PLANS and never returned by webhook price resolution.
// ─────────────────────────────────────────────────────────────
export type Plan = "free" | "solo" | "crew" | "outfit" | "unlimited";
export type BillingPeriod = "monthly" | "annual";

export interface PlanPricing {
  monthly: number;
  annual: number;
  monthlyPriceIdEnv: string;
  annualPriceIdEnv: string;
}

export interface PlanConfig {
  id: Plan;
  name: string;
  vendorLimit: number | null; // null = unlimited
  /** null = no self-serve checkout (Free is always free; Unlimited is contact-only). */
  pricing: PlanPricing | null;
}

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    vendorLimit: 1,
    pricing: null,
  },
  solo: {
    id: "solo",
    name: "Solo",
    vendorLimit: 10,
    pricing: {
      monthly: 10,
      annual: 100,
      monthlyPriceIdEnv: "STRIPE_SOLO_MONTHLY_PRICE_ID",
      annualPriceIdEnv: "STRIPE_SOLO_ANNUAL_PRICE_ID",
    },
  },
  crew: {
    id: "crew",
    name: "Crew",
    vendorLimit: 30,
    pricing: {
      monthly: 20,
      annual: 200,
      monthlyPriceIdEnv: "STRIPE_CREW_MONTHLY_PRICE_ID",
      annualPriceIdEnv: "STRIPE_CREW_ANNUAL_PRICE_ID",
    },
  },
  outfit: {
    id: "outfit",
    name: "Outfit",
    vendorLimit: 50,
    pricing: {
      monthly: 30,
      annual: 300,
      monthlyPriceIdEnv: "STRIPE_OUTFIT_MONTHLY_PRICE_ID",
      annualPriceIdEnv: "STRIPE_OUTFIT_ANNUAL_PRICE_ID",
    },
  },
  unlimited: {
    id: "unlimited",
    name: "Unlimited",
    vendorLimit: null,
    pricing: null,
  },
};

export const PLAN_ORDER: Plan[] = ["free", "solo", "crew", "outfit", "unlimited"];

// Self-serve (Stripe checkout) plans only. Free never checks out and
// Unlimited is contact-only — see CONTACT_SALES_URL.
export const PAID_PLANS: PlanConfig[] = [PLANS.solo, PLANS.crew, PLANS.outfit];

export const CONTACT_SALES_URL = "mailto:hello@getcerttrack.com";

export function planConfig(plan: string | null | undefined): PlanConfig {
  return PLANS[(plan as Plan) ?? "free"] ?? PLANS.free;
}

/** Price in whole dollars for a plan + billing period, or null if not self-serve. */
export function priceForPeriod(plan: Plan, period: BillingPeriod): number | null {
  return PLANS[plan].pricing?.[period] ?? null;
}

/** Env var name holding the Stripe price id for a plan + period, or null if not self-serve. */
export function priceIdEnvFor(plan: Plan, period: BillingPeriod): string | null {
  const pricing = PLANS[plan].pricing;
  if (!pricing) return null;
  return period === "monthly" ? pricing.monthlyPriceIdEnv : pricing.annualPriceIdEnv;
}

// ─────────────────────────────────────────────────────────────
// Vendor status
// ─────────────────────────────────────────────────────────────
export type VendorStatus =
  | "compliant"
  | "expiring_soon"
  | "expired"
  | "missing"
  | "pending_review"
  | "action_needed";

export const EXPIRING_SOON_DAYS = 45;

export const REMINDER_OFFSETS = [45, 14, 0, -7] as const;

// ─────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────
export const COI_BUCKET = "coi-documents";

// ─────────────────────────────────────────────────────────────
// Dev
// ─────────────────────────────────────────────────────────────
export const DEV_ORG_ID =
  process.env.NEXT_PUBLIC_DEV_ORG_ID ??
  "00000000-0000-0000-0000-000000000001";

export const INDUSTRY_TYPES = [
  { value: "construction_trades", label: "Construction & Trades" },
  { value: "property_facilities", label: "Property & Facilities" },
  { value: "food_events", label: "Food & Events" },
  { value: "salon_wellness", label: "Salon & Wellness" },
  { value: "other", label: "Other" },
] as const;

export type IndustryType = (typeof INDUSTRY_TYPES)[number]["value"];

// Industry values used before this category set was simplified from 7
// industries down to these 5. Mapped so orgs that onboarded earlier
// still resolve to a sensible vendor-type set instead of falling back
// to "show everything".
export const LEGACY_INDUSTRY_ALIASES: Record<string, IndustryType> = {
  general_contractor: "construction_trades",
  property_management: "property_facilities",
  landscaping: "property_facilities",
  cleaning: "property_facilities",
  venue_events: "food_events",
  salon_spa: "salon_wellness",
};
