import {
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { humanizeKey } from "@/lib/format";
import type { AIReview, AIReviewCheck } from "@/lib/types";

export function AIReportCard({ review }: { review: AIReview | null }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI compliance review
          </CardTitle>
          {review?.status === "complete" && review.report && (
            <Badge
              variant={review.issues_found === 0 ? "success" : "warning"}
            >
              {review.issues_found === 0
                ? "Clean"
                : `${review.issues_found} issue${review.issues_found === 1 ? "" : "s"}`}
            </Badge>
          )}
        </div>
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
        ) : review.report.checks ? (
          <ChecksReport
            report={review.report}
            checks={review.report.checks}
          />
        ) : (
          <LegacyReport report={review.report} />
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
// New structured pass/fail checklist (reports generated after 0008)
// ─────────────────────────────────────────────────────────────

function ChecksReport({
  report,
  checks,
}: {
  report: NonNullable<AIReview["report"]>;
  checks: AIReviewCheck[];
}) {
  const failed = checks.filter((c) => !c.passed);
  const passed = checks.filter((c) => c.passed);
  const total = checks.length;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">
        {failed.length === 0
          ? `All ${total} requirements met`
          : `${failed.length} of ${total} requirement${total === 1 ? "" : "s"} failed`}
      </p>

      <p className="text-sm text-muted-foreground">{report.summary}</p>

      {/* Failed checks first */}
      {failed.length > 0 && (
        <ul className="space-y-2">
          {failed.map((check, i) => (
            <CheckRow key={i} check={check} />
          ))}
        </ul>
      )}

      {/* Passed checks collapsed */}
      {passed.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
            {passed.length} passed check{passed.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-2 space-y-1.5">
            {passed.map((check, i) => (
              <CheckRow key={i} check={check} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function CheckRow({ check }: { check: AIReviewCheck }) {
  return (
    <li
      className={`rounded-md border p-3 text-sm ${
        check.passed
          ? "border-green-100 bg-green-50/50"
          : check.severity === "critical"
            ? "border-red-200 bg-red-50"
            : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex items-start gap-2">
        {check.passed ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
        ) : check.severity === "critical" ? (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <span className="font-medium">{check.requirement}</span>
            <span className="text-xs text-muted-foreground">
              Required: {check.required}
            </span>
            <span className="text-xs text-muted-foreground">
              Found: {check.found}
            </span>
          </div>
          {!check.passed && check.message && (
            <p className="mt-1 text-muted-foreground">{check.message}</p>
          )}
        </div>
      </div>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────
// Legacy format (flat issues list, reports before 0008)
// ─────────────────────────────────────────────────────────────

function LegacyReport({
  report,
}: {
  report: NonNullable<AIReview["report"]>;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm">{report.summary}</p>
      {report.clean ? (
        <div className="flex items-center gap-2 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" /> No compliance gaps detected.
        </div>
      ) : (
        <ul className="space-y-2">
          {(report.issues ?? []).map((issue, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-md border p-3 text-sm"
            >
              {issue.severity === "critical" ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{humanizeKey(issue.field)}</span>
                  <Badge
                    variant={issue.severity === "critical" ? "danger" : "warning"}
                  >
                    {issue.severity}
                  </Badge>
                </div>
                <p className="text-muted-foreground">{issue.message}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
