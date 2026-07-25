"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

/**
 * One-time "you just upgraded" banner shown on ?upgraded=true after
 * the Stripe checkout success redirect. Dismisses itself (click or
 * after 8s) and strips the query param so a refresh doesn't re-show it.
 */
export function WelcomeBanner({ planName }: { planName: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(searchParams.get("upgraded") === "true");

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(dismiss, 8000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function dismiss() {
    setVisible(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("upgraded");
    const query = params.toString();
    router.replace(query ? `/dashboard?${query}` : "/dashboard");
  }

  if (!visible) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
      <p>
        🎉 Welcome to CertTrack {planName}! You&apos;re all set — start adding
        your vendors.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded p-1 text-green-700 hover:bg-green-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
