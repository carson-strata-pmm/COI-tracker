import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/status";
import type { VendorStatus } from "@/lib/constants";

const VARIANT: Record<
  VendorStatus,
  "success" | "warning" | "danger" | "muted" | "outline"
> = {
  compliant: "success",
  expiring_soon: "warning",
  expired: "danger",
  missing: "muted",
  pending_review: "outline",
  action_needed: "danger",
};

export function StatusBadge({ status }: { status: VendorStatus }) {
  return <Badge variant={VARIANT[status]}>{STATUS_LABELS[status]}</Badge>;
}
