import { differenceInCalendarDays } from "date-fns";
import { EXPIRING_SOON_DAYS, type VendorStatus } from "@/lib/constants";
import type { Certificate } from "@/lib/types";

/**
 * Days until a date (negative if in the past), relative to `from`.
 */
export function daysUntil(date: string | Date, from: Date = new Date()): number {
  return differenceInCalendarDays(new Date(date), from);
}

/**
 * Vendor status logic (see brief — recalculated on every cert
 * insert/update and on the daily cron):
 *
 *   compliant     — latest cert expires more than 45 days from today
 *   expiring_soon — latest cert expires between today and 45 days out
 *   expired       — latest cert's expiration is in the past
 *   missing       — no cert on file at all
 *
 * `certs` may be passed in any order; the most recent by
 * expiration_date (falling back to uploaded_at) is used.
 */
export function computeVendorStatus(
  certs: Certificate[],
  now: Date = new Date()
): VendorStatus {
  if (!certs || certs.length === 0) return "missing";

  const latest = latestCertificate(certs);
  if (!latest || !latest.expiration_date) return "missing";

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
};

export const STATUS_ORDER: VendorStatus[] = [
  "expired",
  "missing",
  "expiring_soon",
  "compliant",
];
