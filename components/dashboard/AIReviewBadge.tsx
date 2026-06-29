import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import type { AIReview } from "@/lib/types";

/**
 * AI review status badge (Pro+ only). Shows clean / issues / pending.
 * Renders nothing when there is no cert to review.
 */
export function AIReviewBadge({
  review,
  hasCert,
}: {
  review: AIReview | null;
  hasCert: boolean;
}) {
  if (!hasCert) return <span className="text-muted-foreground">—</span>;

  if (!review || review.status === "pending") {
    return (
      <Badge variant="muted" className="gap-1">
        <Sparkles className="h-3 w-3" /> Pending
      </Badge>
    );
  }

  if (review.status === "error") {
    return <Badge variant="muted">Review failed</Badge>;
  }

  if (review.issues_found === 0) {
    return (
      <Badge variant="success" className="gap-1">
        <Sparkles className="h-3 w-3" /> Clean
      </Badge>
    );
  }

  return (
    <Badge variant="warning" className="gap-1">
      <Sparkles className="h-3 w-3" />
      {review.issues_found} issue{review.issues_found === 1 ? "" : "s"}
    </Badge>
  );
}
