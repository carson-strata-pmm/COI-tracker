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
