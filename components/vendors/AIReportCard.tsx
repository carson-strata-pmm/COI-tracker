"use client";

import { useState } from "react";
import { Sparkles, CheckCircle2, XCircle, AlertTriangle, ChevronDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NotifyVendorButton } from "@/components/vendors/NotifyVendorButton";
import { getAllChecks, checkStatusLine, type FormattedCheck } from "@/lib/ai-review-format";
import { cn } from "@/lib/utils";
import type { AIReview, Vendor } from "@/lib/types";

export function AIReportCard({
  review,
  vendor,
}: {
  review: AIReview | null;
  vendor: Pick<Vendor, "id" | "company_name" | "contact_name">;
}) {
  const checks =
    review?.status === "complete" ? getAllChecks(review.report) : [];
  const failed = checks.filter((c) => !c.passed);
  const passed = checks.filter((c) => c.passed);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" /> AI compliance review
        </CardTitle>
        <CardDescription>
          Automated gap analysis against your coverage requirements.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!review || review.status === "pending" ? (
          <p className="text-sm text-muted-foreground">
            Review pending. It will appear here automatically once the
            certificate has been analyzed.
          </p>
        ) : review.status === "error" ? (
          <p className="text-sm text-muted-foreground">
            The review could not be completed. Try re-uploading the certificate.
          </p>
        ) : !review.report ? (
          <p className="text-sm text-muted-foreground">No report available.</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {failed.length === 0
                  ? "All checks passed"
                  : `${failed.length} issue${failed.length === 1 ? "" : "s"} found`}
              </p>
              {failed.length > 0 && (
                <NotifyVendorButton
                  vendorId={vendor.id}
                  vendorName={vendor.contact_name ?? vendor.company_name}
                  certId={review.cert_id}
                  aiReviewId={review.id}
                  issues={failed}
                />
              )}
            </div>

            {failed.length > 0 && (
              <ul className="divide-y rounded-md border">
                {failed.map((check, i) => (
                  <IssueRow key={i} check={check} />
                ))}
              </ul>
            )}

            {passed.length > 0 && (
              <PassedChecks checks={passed} total={checks.length} />
            )}
          </div>
        )}
      </CardContent>

      {review?.status === "complete" && review.report && (
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            This is a compliance flag, not a legal determination. Consult your
            broker for complex coverage questions.
          </p>
        </CardFooter>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// One-line issue row, expandable to the plain-language explanation
// ─────────────────────────────────────────────────────────────

function IssueRow({ check }: { check: FormattedCheck }) {
  const [open, setOpen] = useState(false);
  const critical = check.severity === "critical";
  const Icon = critical ? XCircle : AlertTriangle;

  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={!check.detail}
        className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/40 disabled:cursor-default"
      >
        <Icon
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0",
            critical ? "text-red-600" : "text-amber-600"
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="font-medium">{check.label}</span>
          <span className="text-muted-foreground"> — {checkStatusLine(check)}</span>
        </span>
        {check.detail && (
          <ChevronDown
            className={cn(
              "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        )}
      </button>
      {open && check.detail && (
        <div className="px-3 pb-3 pl-9 text-sm text-muted-foreground">
          {check.detail}
        </div>
      )}
    </li>
  );
}

// ─────────────────────────────────────────────────────────────
// Passing checks — hidden by default
// ─────────────────────────────────────────────────────────────

function PassedChecks({
  checks,
  total,
}: {
  checks: FormattedCheck[];
  total: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
        {checks.length} of {total} checks passed
        <span className="underline">
          {open ? "Hide" : "Show passing checks"}
        </span>
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5 pl-5">
          {checks.map((c, i) => (
            <li
              key={i}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <CheckCircle2 className="h-3 w-3 shrink-0 text-green-600/70" />
              {c.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
