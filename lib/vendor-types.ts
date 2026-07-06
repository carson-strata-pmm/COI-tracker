import type { IndustryType } from "@/lib/constants";

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

// Which of the vendor types above are relevant to each industry —
// narrows the Coverage Rules list and the vendor-type picker to what
// an org of that type actually deals with. "other" (and any unknown
// industry) falls back to the full list.
export const INDUSTRY_VENDOR_TYPES: Record<IndustryType, readonly VendorType[]> = {
  general_contractor: [
    "General Contractor",
    "Electrician",
    "Plumber",
    "Roofer",
    "HVAC",
    "Framing Contractor",
    "Concrete Contractor",
    "Painter",
    "Delivery / Courier",
    "IT / Tech Vendor",
    "Other",
  ],
  property_management: [
    "Property Maintenance",
    "Electrician",
    "Plumber",
    "Roofer",
    "HVAC",
    "Landscaper",
    "Cleaner / Janitorial",
    "Pest Control",
    "Security",
    "Painter",
    "Delivery / Courier",
    "Other",
  ],
  salon_spa: [
    "Booth Renter",
    "Personal Trainer",
    "Massage Therapist",
    "Cleaner / Janitorial",
    "Security",
    "Delivery / Courier",
    "Other",
  ],
  venue_events: [
    "Caterer / Food Vendor",
    "Event Vendor (AV / Decor)",
    "Food Truck",
    "Security",
    "Cleaner / Janitorial",
    "Electrician",
    "Delivery / Courier",
    "Other",
  ],
  landscaping: [
    "Landscaper",
    "Pest Control",
    "Delivery / Courier",
    "IT / Tech Vendor",
    "Other",
  ],
  cleaning: [
    "Cleaner / Janitorial",
    "Pest Control",
    "Security",
    "Delivery / Courier",
    "Other",
  ],
  other: VENDOR_TYPES,
};

/**
 * Vendor types relevant to an org's industry. Unknown/unset industry
 * falls back to the full list rather than hiding everything.
 */
export function getVendorTypesForIndustry(
  industryType: string | null | undefined
): readonly string[] {
  if (industryType && industryType in INDUSTRY_VENDOR_TYPES) {
    return INDUSTRY_VENDOR_TYPES[industryType as IndustryType];
  }
  return VENDOR_TYPES;
}
