import { Sparkles, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { humanizeKey } from "@/lib/format";
import type { AIReview } from "@/lib/types";

/**
 * Plain-language AI gap report (Pro+). Surfaces the structured
 * report stored in ai_reviews.
 */
export function AIReportCard({ review }: { review: AIReview | null }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI compliance review
          </CardTitle>
          {review?.status === "complete" && (
            <Badge
              variant={review.issues_found === 0 ? "success" : "warning"}
            >
              {review.issues_found === 0
                ? "Clean"
                : `${review.issues_found} issue${
                    review.issues_found === 1 ? "" : "s"
                  }`}
            </Badge>
          )}
        </div>
        <CardDescription>
          Automated gap analysis. Not a coverage determination — consult your
          broker for ambiguous cases.
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
            The review could not be completed. Try re-uploading the
            certificate.
          </p>
        ) : !review.report ? (
          <p className="text-sm text-muted-foreground">No report available.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">{review.report.summary}</p>
            {review.report.clean ? (
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4" /> No compliance gaps detected.
              </div>
            ) : (
              <ul className="space-y-2">
                {review.report.issues.map((issue, i) => (
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
                        <span className="font-medium">
                          {humanizeKey(issue.field)}
                        </span>
                        <Badge
                          variant={
                            issue.severity === "critical" ? "danger" : "warning"
                          }
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
        )}
      </CardContent>
    </Card>
  );
}
