// ─────────────────────────────────────────────────────────────
// Plans — annual billing, 4 tiers, AI review on all plans
// ─────────────────────────────────────────────────────────────
export type Plan = "starter" | "growth" | "scale" | "unlimited";

export interface PlanConfig {
  id: Plan;
  name: string;
  priceYearly: number;
  vendorLimit: number | null; // null = unlimited
  priceIdEnv: string; // env var holding the Stripe price id
}

export const PLANS: Record<Plan, PlanConfig> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceYearly: 20,
    vendorLimit: 10,
    priceIdEnv: "STRIPE_STARTER_PRICE_ID",
  },
  growth: {
    id: "growth",
    name: "Growth",
    priceYearly: 100,
    vendorLimit: 30,
    priceIdEnv: "STRIPE_GROWTH_PRICE_ID",
  },
  scale: {
    id: "scale",
    name: "Scale",
    priceYearly: 200,
    vendorLimit: 50,
    priceIdEnv: "STRIPE_SCALE_PRICE_ID",
  },
  unlimited: {
    id: "unlimited",
    name: "Unlimited",
    priceYearly: 500,
    vendorLimit: null,
    priceIdEnv: "STRIPE_UNLIMITED_PRICE_ID",
  },
};

export const PLAN_ORDER: Plan[] = ["starter", "growth", "scale", "unlimited"];

export function planConfig(plan: string | null | undefined): PlanConfig {
  return PLANS[(plan as Plan) ?? "starter"] ?? PLANS.starter;
}

/** The next tier up from the given plan, or null if already at the top. */
export function nextPlan(plan: Plan): PlanConfig | null {
  const idx = PLAN_ORDER.indexOf(plan);
  if (idx === -1 || idx === PLAN_ORDER.length - 1) return null;
  return PLANS[PLAN_ORDER[idx + 1]];
}

// ─────────────────────────────────────────────────────────────
// Vendor status
// ─────────────────────────────────────────────────────────────
export type VendorStatus =
  | "compliant"
  | "expiring_soon"
  | "expired"
  | "missing";

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
  { value: "general_contractor", label: "General Contractor" },
  { value: "property_management", label: "Property Management" },
  { value: "salon_spa", label: "Salon / Spa" },
  { value: "venue_events", label: "Venue / Events" },
  { value: "landscaping", label: "Landscaping" },
  { value: "cleaning", label: "Cleaning Services" },
  { value: "other", label: "Other" },
] as const;
