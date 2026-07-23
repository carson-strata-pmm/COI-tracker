import { formatDate } from "@/lib/format";
import { NotifyVendorButton } from "@/components/vendors/NotifyVendorButton";
import type { Vendor, VendorNotification } from "@/lib/types";

/** "Last notified: ... — N issues sent  [Resend]" below the AI review card. */
export function NotificationHistory({
  vendor,
  notifications,
}: {
  vendor: Pick<Vendor, "id" | "company_name" | "contact_name">;
  notifications: VendorNotification[];
}) {
  if (notifications.length === 0) return null;

  const latest = notifications[0];
  const issues = latest.issues_sent ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <span>
        Last notified: {formatDate(latest.sent_at)} — {issues.length} issue
        {issues.length === 1 ? "" : "s"} sent
      </span>
      {latest.cert_id && latest.ai_review_id && issues.length > 0 && (
        <NotifyVendorButton
          vendorId={vendor.id}
          vendorName={vendor.contact_name ?? vendor.company_name}
          certId={latest.cert_id}
          aiReviewId={latest.ai_review_id}
          issues={issues}
          variant="link"
          label="Resend"
        />
      )}
    </div>
  );
}
