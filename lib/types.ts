import type { Plan, VendorStatus } from "@/lib/constants";
import type { FormattedCheck } from "@/lib/ai-review-format";

export interface Organization {
  id: string;
  name: string;
  industry_type: string | null;
  plan: Plan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

export interface AppUser {
  id: string;
  org_id: string | null;
  email: string;
  role: "admin" | "member";
  created_at: string;
}

export interface Vendor {
  id: string;
  org_id: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  vendor_type: string | null;
  vendor_type_notes: string | null;
  status: VendorStatus;
  created_at: string;
}

export interface Certificate {
  id: string;
  vendor_id: string;
  org_id: string;
  file_path: string;
  insurer_name: string | null;
  policy_number: string | null;
  effective_date: string | null;
  expiration_date: string | null;
  coverage_types: string[] | null;
  limits: Record<string, number | string> | null;
  named_insured: string | null;
  additional_insured: boolean | null;
  waiver_of_subrogation: boolean | null;
  parse_confidence: number | null;
  parse_source: "textract" | "claude" | "manual" | null;
  uploaded_at: string;
  uploaded_by: "org" | "vendor" | null;
}

// ─────────────────────────────────────────────────────────────
// Coverage requirements
// ─────────────────────────────────────────────────────────────

export interface CoverageRequirement {
  id: string;
  org_id: string | null; // null = system default
  vendor_type: string;
  gl_per_occurrence_min: number | null;
  gl_aggregate_min: number | null;
  workers_comp_required: boolean;
  auto_required: boolean;
  auto_min: number | null;
  umbrella_required: boolean;
  umbrella_min: number | null;
  additional_insured_required: boolean;
  waiver_of_subrogation_required: boolean;
  is_custom: boolean;
  created_at: string;
}

// Merged view for the settings table — the resolved values plus flags
// indicating whether an org override is in effect, and whether this
// vendor type exists only for this org (added via "+", no system default).
export interface ResolvedRequirement extends CoverageRequirement {
  hasCustomOverride: boolean;
  isCustomVendorType: boolean;
}

// ─────────────────────────────────────────────────────────────
// AI review
// ─────────────────────────────────────────────────────────────

export interface AIReviewIssue {
  field: string;
  severity: "warning" | "critical";
  message: string;
}

export interface AIReviewCheck {
  requirement: string;
  required: string;
  found: string;
  passed: boolean;
  severity: "critical" | "warning" | null;
  message: string | null;
}

export interface AIReviewReport {
  issues_found: number;
  clean: boolean;
  summary: string;
  named_insured_match?: boolean | null;
  // Structured pass/fail per requirement (new format, migration 0008+)
  checks?: AIReviewCheck[];
  // Legacy flat issues list (reports generated before migration 0008)
  issues?: AIReviewIssue[];
}

export interface AIReview {
  id: string;
  cert_id: string;
  org_id: string;
  status: "pending" | "complete" | "error";
  issues_found: number;
  report: AIReviewReport | null;
  created_at: string;
}

export interface UploadRequest {
  id: string;
  vendor_id: string;
  org_id: string;
  token: string;
  sent_at: string;
  completed_at: string | null;
  expires_at: string;
}

export interface ReminderLog {
  id: string;
  vendor_id: string;
  cert_id: string | null;
  type: "45d" | "14d" | "expired" | "escalation";
  sent_at: string;
}

export interface VendorNotification {
  id: string;
  vendor_id: string;
  org_id: string;
  cert_id: string | null;
  ai_review_id: string | null;
  upload_request_id: string | null;
  issues_sent: FormattedCheck[] | null;
  sent_via: ("email" | "sms")[];
  sent_at: string;
}

// A vendor row joined with its latest certificate + AI review for
// the dashboard table.
export interface VendorWithCert extends Vendor {
  latest_certificate: Certificate | null;
  latest_ai_review: AIReview | null;
}
