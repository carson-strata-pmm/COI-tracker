"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { notifyVendor, type NotifyVendorResult } from "@/app/(app)/vendors/actions";
import { checkStatusLine, type FormattedCheck } from "@/lib/ai-review-format";

export function NotifyVendorButton({
  vendorId,
  vendorName,
  certId,
  aiReviewId,
  issues,
  variant = "default",
  size = "sm",
  label = "Notify vendor",
}: {
  vendorId: string;
  vendorName: string;
  certId: string;
  aiReviewId: string;
  issues: FormattedCheck[];
  variant?: "default" | "outline" | "link";
  size?: "sm" | "default";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<NotifyVendorResult | null>(null);
  const router = useRouter();

  function openModal() {
    setResult(null);
    setOpen(true);
  }

  function send() {
    startTransition(async () => {
      const res = await notifyVendor(vendorId, certId, aiReviewId);
      setResult(res);
      if (res.ok) router.refresh();
    });
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={openModal}
        className={variant === "link" ? "h-auto gap-1 p-0 text-xs" : "gap-1.5"}
      >
        <Send className={variant === "link" ? "h-3 w-3" : "h-3.5 w-3.5"} /> {label}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (!pending) setOpen(o);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send issues to {vendorName}?</DialogTitle>
            <DialogDescription>
              We&apos;ll email (and text if a number is on file) a summary of
              the issues below, with a link to upload a corrected
              certificate.
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-1.5 rounded-md border bg-muted/30 p-3 text-sm">
            {issues.map((c, i) => (
              <li key={i}>
                • {c.label} — {checkStatusLine(c)}
              </li>
            ))}
          </ul>

          {result && !result.ok && (
            <p className="text-sm text-destructive">{result.error}</p>
          )}
          {result?.ok && (
            <p className="text-sm text-green-700">
              Notification sent{result.sentTo ? ` to ${result.sentTo}` : ""}.
            </p>
          )}

          <DialogFooter>
            {result?.ok ? (
              <Button onClick={() => setOpen(false)}>Done</Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  Cancel
                </Button>
                <Button onClick={send} disabled={pending}>
                  {pending ? "Sending…" : "Send notification"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
