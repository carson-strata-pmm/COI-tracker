// Normalizes an AI review report's checks into one shape, whether it's
// the current structured `checks` format or a legacy flat `issues`
// list (reports generated before migration 0008). Client-safe (no
// server-only imports) so the review card UI, the notify-vendor
// server action, and the email/SMS templates all share one source of
// truth for "what are the failed checks, and how do we describe them."
import { humanizeKey } from "@/lib/format";
import type { AIReviewReport } from "@/lib/types";

export interface FormattedCheck {
  label: string;
  found: string | null;
  required: string | null;
  detail: string | null;
  severity: "critical" | "warning" | null;
  passed: boolean;
}

export function getAllChecks(
  report: AIReviewReport | null | undefined
): FormattedCheck[] {
  if (!report) return [];
  if (report.checks) {
    return report.checks.map((c) => ({
      label: c.requirement,
      found: c.found,
      required: c.required,
      detail: c.message,
      severity: c.severity,
      passed: c.passed,
    }));
  }
  return (report.issues ?? []).map((i) => ({
    label: humanizeKey(i.field),
    found: null,
    required: null,
    detail: i.message,
    severity: i.severity,
    passed: false,
  }));
}

export function getFailedChecks(
  report: AIReviewReport | null | undefined
): FormattedCheck[] {
  return getAllChecks(report).filter((c) => !c.passed);
}

export function getPassedChecks(
  report: AIReviewReport | null | undefined
): FormattedCheck[] {
  return getAllChecks(report).filter((c) => c.passed);
}

/**
 * Short status suffix for the one-line view, e.g. "not detected" or
 * "$500,000 found, $1,000,000 required". Used in the review card, the
 * notification email, and the SMS.
 */
export function checkStatusLine(check: FormattedCheck): string {
  if (!check.found) return check.passed ? "OK" : "Not detected";
  const foundIsNumeric = /\d/.test(check.found);
  const requiredIsNumeric = check.required ? /\d/.test(check.required) : false;
  if (foundIsNumeric && requiredIsNumeric) {
    return `${check.found} found, ${check.required} required`;
  }
  return check.found;
}
