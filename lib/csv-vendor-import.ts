// Client-safe CSV row validation for bulk vendor import. Pure
// functions only (no React) so the modal component and, if ever
// needed, the server action can share the same rules.

export type CsvRowStatus = "ready" | "warning" | "error" | "limit";

export interface ParsedVendorRow {
  row: number; // 1-indexed data row (matches what a spreadsheet user sees, header excluded)
  company_name: string;
  contractor_type: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  status: CsvRowStatus;
  issue: string | null;
  /** The canonical vendor type this row resolved to, or null if unmatched. */
  resolvedType: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
}

/**
 * Case-insensitive exact match against the valid type list — not a
 * true fuzzy/substring matcher. "electrician" matches "Electrician";
 * "cleaning" does NOT match "Cleaner / Janitorial" (too ambiguous to
 * guess safely), so it's reported as unknown for the user to fix.
 */
export function matchVendorType(
  input: string,
  validTypes: string[]
): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;
  return validTypes.find((t) => t.toLowerCase() === trimmed) ?? null;
}

/**
 * Validates parsed CSV rows against required fields, vendor type,
 * email/phone format, and duplicate company names — both against the
 * org's existing vendors and against earlier rows in the same file.
 */
export function validateRows(
  rawRows: Record<string, string>[],
  validTypes: string[],
  existingNamesLower: Set<string>
): ParsedVendorRow[] {
  const seen = new Set(existingNamesLower);

  return rawRows.map((raw, i) => {
    const company_name = (raw.company_name ?? "").trim();
    const contractor_type = (raw.contractor_type ?? "").trim();
    const contact_name = (raw.contact_name ?? "").trim();
    const contact_email = (raw.contact_email ?? "").trim();
    const contact_phone = (raw.contact_phone ?? "").trim();
    const base = {
      row: i + 1,
      company_name,
      contractor_type,
      contact_name,
      contact_email,
      contact_phone,
    };

    if (!company_name) {
      return { ...base, status: "error" as const, issue: "Company name is required", resolvedType: null };
    }

    const resolvedType = matchVendorType(contractor_type, validTypes);
    if (!resolvedType) {
      return { ...base, status: "error" as const, issue: "Unknown contractor type", resolvedType: null };
    }

    let status: CsvRowStatus = "ready";
    let issue: string | null = null;

    if (contact_email && !isValidEmail(contact_email)) {
      status = "warning";
      issue = "Invalid email — COI requests won't send";
    } else if (contact_phone && !isValidPhone(contact_phone)) {
      status = "warning";
      issue = "Invalid phone — SMS won't send";
    } else if (seen.has(company_name.toLowerCase())) {
      status = "warning";
      issue = "May be a duplicate";
    }

    seen.add(company_name.toLowerCase());

    return { ...base, status, issue, resolvedType };
  });
}

/**
 * Downgrades "ready"/"warning" rows beyond the org's remaining
 * contractor capacity to "limit" status, in file order, so the
 * preview shows exactly which rows won't be imported due to the plan.
 */
export function applyPlanLimit(
  rows: ParsedVendorRow[],
  availableSlots: number
): ParsedVendorRow[] {
  let counted = 0;
  return rows.map((r) => {
    if (r.status === "error") return r;
    counted += 1;
    if (counted > availableSlots) {
      return { ...r, status: "limit" as const, issue: "Plan limit reached" };
    }
    return r;
  });
}
