"use client";

import { useState, useTransition } from "react";
import { Mail, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Requests a COI upload link from the server for a vendor and shows
 * the generated link (and whether the email was sent). Wired to
 * POST /api/request-upload (Phase 4).
 */
export function RequestCoiButton({
  vendorId,
  size = "sm",
}: {
  vendorId: string;
  size?: "sm" | "default";
}) {
  const [pending, startTransition] = useTransition();
  const [link, setLink] = useState<string | null>(null);
  const [emailed, setEmailed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function request() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/request-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vendor_id: vendorId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Request failed");
        setLink(data.upload_url);
        setEmailed(Boolean(data.emailed));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Request failed");
      }
    });
  }

  function copy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (link) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link}
            className="w-full max-w-xs truncate rounded border bg-muted px-2 py-1 text-xs"
          />
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <span className="text-xs text-muted-foreground">
          {emailed
            ? "Email sent to the contractor."
            : "Link generated — share it with the contractor."}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        size={size}
        variant="outline"
        onClick={request}
        disabled={pending}
      >
        <Mail className="h-4 w-4" />
        {pending ? "Requesting…" : "Request COI"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
