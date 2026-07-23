import { LEGACY_INDUSTRY_ALIASES, type IndustryType } from "@/lib/constants";

// Canonical list of vendor types. Must stay in sync with the
// coverage_requirements seed data in migration 0008.
export const VENDOR_TYPES = [
  "General Contractor",
  "Electrician",
  "Plumber",
  "Roofer",
  "HVAC",
  "Framing Contractor",
  "Concrete Contractor",
  "Painter",
  "Property Maintenance",
  "Landscaper",
  "Cleaner / Janitorial",
  "Pest Control",
  "Security",
  "Caterer / Food Vendor",
  "Event Vendor (AV / Decor)",
  "Food Truck",
  "Booth Renter",
  "Personal Trainer",
  "Massage Therapist",
  "IT / Tech Vendor",
  "Delivery / Courier",
  "Other",
] as const;

export type VendorType = (typeof VENDOR_TYPES)[number];

/**
 * Sorts vendor type names alphabetically, with "Other" always pinned
 * last regardless of where it'd otherwise sort. Used for the vendor
 * type picker and any other full-list display.
 */
export function sortVendorTypesWithOtherLast(types: string[]): string[] {
  const rest = types.filter((t) => t !== "Other").sort((a, b) => a.localeCompare(b));
  return types.includes("Other") ? [...rest, "Other"] : rest;
}

// Which of the vendor types above belong to each industry category —
// a clean partition of all 22 types, each appearing in exactly one
// category. Narrows the Coverage Rules list to what an org of that
// category actually deals with (the vendor-type picker on Add/Edit
// Vendor intentionally shows the full list — see getVendorTypeOptions
// in lib/queries.ts — so nothing blocks adding a legitimate vendor
// outside the org's primary industry).
export const INDUSTRY_VENDOR_TYPES: Record<IndustryType, readonly VendorType[]> = {
  construction_trades: [
    "General Contractor",
    "Electrician",
    "Plumber",
    "Roofer",
    "HVAC",
    "Framing Contractor",
    "Concrete Contractor",
    "Painter",
  ],
  property_facilities: [
    "Property Maintenance",
    "Landscaper",
    "Cleaner / Janitorial",
    "Pest Control",
    "Security",
  ],
  food_events: [
    "Caterer / Food Vendor",
    "Event Vendor (AV / Decor)",
    "Food Truck",
  ],
  salon_wellness: ["Booth Renter", "Personal Trainer", "Massage Therapist"],
  other: ["IT / Tech Vendor", "Delivery / Courier", "Other"],
};

/**
 * Vendor types relevant to an org's industry category. Resolves
 * industry values from before the category set was simplified (see
 * LEGACY_INDUSTRY_ALIASES) to their new equivalent. Unknown/unset
 * industry falls back to the full list rather than hiding everything.
 */
export function getVendorTypesForIndustry(
  industryType: string | null | undefined
): readonly string[] {
  if (!industryType) return VENDOR_TYPES;
  const resolved =
    (industryType as IndustryType) in INDUSTRY_VENDOR_TYPES
      ? (industryType as IndustryType)
      : LEGACY_INDUSTRY_ALIASES[industryType];
  return resolved ? INDUSTRY_VENDOR_TYPES[resolved] : VENDOR_TYPES;
}
