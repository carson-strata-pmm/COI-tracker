// ─────────────────────────────────────────────────────────────
// Plans — annual billing, 5 tiers, AI review on all plans
// ─────────────────────────────────────────────────────────────
export type Plan = "free" | "solo" | "crew" | "outfit" | "unlimited";

export interface PlanConfig {
  id: Plan;
  name: string;
  priceYearly: number;
  vendorLimit: number | null; // null = unlimited
  priceIdEnv: string; // env var holding the Stripe price id (empty for free)
}

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    priceYearly: 0,
    vendorLimit: 1,
    priceIdEnv: "",
  },
  solo: {
    id: "solo",
    name: "Solo",
    priceYearly: 20,
    vendorLimit: 10,
    priceIdEnv: "STRIPE_SOLO_PRICE_ID",
  },
  crew: {
    id: "crew",
    name: "Crew",
    priceYearly: 100,
    vendorLimit: 30,
    priceIdEnv: "STRIPE_CREW_PRICE_ID",
  },
  outfit: {
    id: "outfit",
    name: "Outfit",
    priceYearly: 200,
    vendorLimit: 50,
    priceIdEnv: "STRIPE_OUTFIT_PRICE_ID",
  },
  unlimited: {
    id: "unlimited",
    name: "Unlimited",
    priceYearly: 500,
    vendorLimit: null,
    priceIdEnv: "STRIPE_UNLIMITED_PRICE_ID",
  },
};

export const PLAN_ORDER: Plan[] = ["free", "solo", "crew", "outfit", "unlimited"];

export const PAID_PLANS: PlanConfig[] = [
  PLANS.solo,
  PLANS.crew,
  PLANS.outfit,
  PLANS.unlimited,
];

export function planConfig(plan: string | null | undefined): PlanConfig {
  return PLANS[(plan as Plan) ?? "free"] ?? PLANS.free;
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
