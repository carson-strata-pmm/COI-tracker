import type { Plan, VendorStatus } from "@/lib/constants";

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
  vendor_type: string | null;
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

export interface AIReviewIssue {
  field: string;
  severity: "warning" | "critical";
  message: string;
}

export interface AIReviewReport {
  issues_found: number;
  issues: AIReviewIssue[];
  summary: string;
  clean: boolean;
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

// A vendor row joined with its latest certificate + AI review for
// the dashboard table.
export interface VendorWithCert extends Vendor {
  latest_certificate: Certificate | null;
  latest_ai_review: AIReview | null;
}
