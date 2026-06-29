// ─────────────────────────────────────────────────────────────
// Plans
// ─────────────────────────────────────────────────────────────
export type Plan = "free" | "pro" | "pro_plus";

export interface PlanConfig {
  id: Plan;
  name: string;
  priceMonthly: number;
  vendorLimit: number | null; // null = unlimited
  aiReview: boolean;
  priceIdEnv: string; // env var holding the Stripe price id
}

export const PLANS: Record<Plan, PlanConfig> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    vendorLimit: 15,
    aiReview: false,
    priceIdEnv: "STRIPE_FREE_PRICE_ID",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 19,
    vendorLimit: 50,
    aiReview: false,
    priceIdEnv: "STRIPE_PRO_PRICE_ID",
  },
  pro_plus: {
    id: "pro_plus",
    name: "Pro+",
    priceMonthly: 39,
    vendorLimit: null,
    aiReview: true,
    priceIdEnv: "STRIPE_PRO_PLUS_PRICE_ID",
  },
};

export function planConfig(plan: string | null | undefined): PlanConfig {
  return PLANS[(plan as Plan) ?? "free"] ?? PLANS.free;
}

// ─────────────────────────────────────────────────────────────
// Vendor status
// ─────────────────────────────────────────────────────────────
export type VendorStatus =
  | "compliant"
  | "expiring_soon"
  | "expired"
  | "missing";

// Days-until-expiration threshold separating "compliant" from
// "expiring_soon". Also the first reminder offset.
export const EXPIRING_SOON_DAYS = 45;

// Reminder offsets (days until expiration) the daily cron checks.
// Negative means after expiration.
export const REMINDER_OFFSETS = [45, 14, 0, -7] as const;

// ─────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────
export const COI_BUCKET = "coi-documents";

// ─────────────────────────────────────────────────────────────
// Dev (auth deferred to Phase 8)
// ─────────────────────────────────────────────────────────────
export const DEV_ORG_ID =
  process.env.NEXT_PUBLIC_DEV_ORG_ID ??
  "00000000-0000-0000-0000-000000000001";

// Industry options surfaced in settings + onboarding.
export const INDUSTRY_TYPES = [
  { value: "general_contractor", label: "General Contractor" },
  { value: "property_management", label: "Property Management" },
  { value: "salon_spa", label: "Salon / Spa" },
  { value: "venue_events", label: "Venue / Events" },
  { value: "landscaping", label: "Landscaping" },
  { value: "cleaning", label: "Cleaning Services" },
  { value: "other", label: "Other" },
] as const;
