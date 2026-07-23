import { differenceInCalendarDays } from "date-fns";
import { EXPIRING_SOON_DAYS, type VendorStatus } from "@/lib/constants";
import type { AIReview, Certificate } from "@/lib/types";

/**
 * Days until a date (negative if in the past), relative to `from`.
 */
export function daysUntil(date: string | Date, from: Date = new Date()): number {
  return differenceInCalendarDays(new Date(date), from);
}

/**
 * Vendor status logic (recalculated on cert insert, on AI review
 * completion, and on the daily cron):
 *
 *   pending_review — latest cert's AI review hasn't finished yet
 *   action_needed  — AI review completed and found one or more issues
 *   compliant      — review clean (or AI disabled) and cert expires
 *                    more than 45 days out
 *   expiring_soon  — expires within 45 days
 *   expired        — expiration is in the past
 *   missing        — no cert on file at all
 *
 * `certs` may be passed in any order; the most recent by
 * expiration_date (falling back to uploaded_at) is used. The AI
 * review branch only applies when `aiReviewEnabled` is true and
 * `latestReview` is for that same latest cert — this keeps the
 * function pure (no server-only imports) so client components can
 * still import STATUS_LABELS/STATUS_ORDER from this module.
 */
export function resolveVendorStatus(args: {
  certs: Certificate[];
  latestReview?: Pick<AIReview, "cert_id" | "status" | "issues_found"> | null;
  aiReviewEnabled?: boolean;
  now?: Date;
}): VendorStatus {
  const { certs, latestReview = null, aiReviewEnabled = false, now = new Date() } = args;
  if (!certs || certs.length === 0) return "missing";

  const latest = latestCertificate(certs);
  if (!latest) return "missing";

  if (aiReviewEnabled) {
    const reviewForLatest =
      latestReview && latestReview.cert_id === latest.id ? latestReview : null;
    if (!reviewForLatest || reviewForLatest.status === "pending") {
      return "pending_review";
    }
    if (reviewForLatest.status === "complete" && reviewForLatest.issues_found > 0) {
      return "action_needed";
    }
    // status === "error" falls through to date-based status below.
  }

  if (!latest.expiration_date) return "missing";
  const days = daysUntil(latest.expiration_date, now);
  if (days < 0) return "expired";
  if (days <= EXPIRING_SOON_DAYS) return "expiring_soon";
  return "compliant";
}

/**
 * The "current" certificate for a vendor: the one with the latest
 * expiration date. Certs without an expiration date sort last and
 * are only chosen if nothing else exists.
 */
export function latestCertificate(
  certs: Certificate[]
): Certificate | null {
  if (!certs || certs.length === 0) return null;
  return [...certs].sort((a, b) => {
    const ax = a.expiration_date ? new Date(a.expiration_date).getTime() : -Infinity;
    const bx = b.expiration_date ? new Date(b.expiration_date).getTime() : -Infinity;
    if (ax !== bx) return bx - ax;
    return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
  })[0];
}

export const STATUS_LABELS: Record<VendorStatus, string> = {
  compliant: "Compliant",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
  missing: "Missing",
  pending_review: "Pending Review",
  action_needed: "Action Needed",
};

export const STATUS_ORDER: VendorStatus[] = [
  "action_needed",
  "expired",
  "pending_review",
  "missing",
  "expiring_soon",
  "compliant",
];
