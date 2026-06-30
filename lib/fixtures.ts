// In-memory fixtures mirroring supabase/seed.sql. Used as a
// read-only fallback so the dashboard renders before a Supabase
// project is connected. Once NEXT_PUBLIC_SUPABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY are set, the real DB is used instead.

import type { VendorWithCert } from "@/lib/types";
import { DEV_ORG_ID } from "@/lib/constants";

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function dateDaysFromNow(days: number): string {
  return isoDaysFromNow(days).slice(0, 10);
}

export const FIXTURE_ORG = {
  id: DEV_ORG_ID,
  name: "Acme General Contracting",
  industry_type: "general_contractor",
  plan: "pro_plus" as const,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  created_at: isoDaysFromNow(-200),
};

export const FIXTURE_VENDORS: VendorWithCert[] = [
  {
    id: "10000000-0000-0000-0000-000000000001",
    org_id: DEV_ORG_ID,
    company_name: "Bright Spark Electric",
    contact_name: "Dana Ruiz",
    contact_email: "dana@brightspark.example",
    contact_phone: null,
    vendor_type: "electrical",
    status: "compliant",
    created_at: isoDaysFromNow(-150),
    latest_certificate: {
      id: "20000000-0000-0000-0000-000000000001",
      vendor_id: "10000000-0000-0000-0000-000000000001",
      org_id: DEV_ORG_ID,
      file_path: "coi-documents/seed/brightspark.pdf",
      insurer_name: "Travelers",
      policy_number: "GL-8841200",
      effective_date: dateDaysFromNow(-120),
      expiration_date: dateDaysFromNow(210),
      coverage_types: ["General Liability", "Workers Compensation", "Auto Liability"],
      limits: {
        general_liability_each_occurrence: 1000000,
        general_liability_aggregate: 2000000,
        auto_liability: 1000000,
      },
      named_insured: "Bright Spark Electric LLC",
      additional_insured: true,
      waiver_of_subrogation: true,
      parse_confidence: 0.94,
      parse_source: "textract",
      uploaded_at: isoDaysFromNow(-120),
      uploaded_by: "vendor",
    },
    latest_ai_review: null,
  },
  {
    id: "10000000-0000-0000-0000-000000000002",
    org_id: DEV_ORG_ID,
    company_name: "Summit Roofing Co",
    contact_name: "Marco Hill",
    contact_email: "marco@summitroof.example",
    contact_phone: null,
    vendor_type: "roofing",
    status: "expiring_soon",
    created_at: isoDaysFromNow(-140),
    latest_certificate: {
      id: "20000000-0000-0000-0000-000000000002",
      vendor_id: "10000000-0000-0000-0000-000000000002",
      org_id: DEV_ORG_ID,
      file_path: "coi-documents/seed/summit.pdf",
      insurer_name: "The Hartford",
      policy_number: "GL-5523019",
      effective_date: dateDaysFromNow(-330),
      expiration_date: dateDaysFromNow(21),
      coverage_types: ["General Liability", "Workers Compensation"],
      limits: {
        general_liability_each_occurrence: 1000000,
        general_liability_aggregate: 2000000,
      },
      named_insured: "Summit Roofing Co Inc",
      additional_insured: true,
      waiver_of_subrogation: false,
      parse_confidence: 0.88,
      parse_source: "textract",
      uploaded_at: isoDaysFromNow(-330),
      uploaded_by: "vendor",
    },
    latest_ai_review: null,
  },
  {
    id: "10000000-0000-0000-0000-000000000003",
    org_id: DEV_ORG_ID,
    company_name: "Clearview Glass & Glazing",
    contact_name: "Priya Nair",
    contact_email: "priya@clearview.example",
    contact_phone: null,
    vendor_type: "glazing",
    status: "expired",
    created_at: isoDaysFromNow(-130),
    latest_certificate: {
      id: "20000000-0000-0000-0000-000000000003",
      vendor_id: "10000000-0000-0000-0000-000000000003",
      org_id: DEV_ORG_ID,
      file_path: "coi-documents/seed/clearview.pdf",
      insurer_name: "Liberty Mutual",
      policy_number: "GL-2210567",
      effective_date: dateDaysFromNow(-400),
      expiration_date: dateDaysFromNow(-35),
      coverage_types: ["General Liability"],
      limits: {
        general_liability_each_occurrence: 500000,
        general_liability_aggregate: 1000000,
      },
      named_insured: "Clearview Glass & Glazing",
      additional_insured: false,
      waiver_of_subrogation: false,
      parse_confidence: 0.71,
      parse_source: "claude",
      uploaded_at: isoDaysFromNow(-400),
      uploaded_by: "org",
    },
    latest_ai_review: {
      id: "30000000-0000-0000-0000-000000000001",
      cert_id: "20000000-0000-0000-0000-000000000003",
      org_id: DEV_ORG_ID,
      status: "complete",
      issues_found: 2,
      report: {
        issues_found: 2,
        issues: [
          {
            field: "gl_limit",
            severity: "warning",
            message:
              "GL each-occurrence limit is $500K — typical minimum for contractors is $1M.",
          },
          {
            field: "additional_insured",
            severity: "critical",
            message: "Additional insured endorsement was not detected.",
          },
        ],
        summary:
          "2 issues found. GL limit is below typical minimums and additional insured endorsement was not detected.",
        clean: false,
      },
      created_at: isoDaysFromNow(-30),
    },
  },
  {
    id: "10000000-0000-0000-0000-000000000004",
    org_id: DEV_ORG_ID,
    company_name: "Iron Oak Framing",
    contact_name: "Sam Whitfield",
    contact_email: "sam@ironoak.example",
    contact_phone: null,
    vendor_type: "framing",
    status: "missing",
    created_at: isoDaysFromNow(-10),
    latest_certificate: null,
    latest_ai_review: null,
  },
];
