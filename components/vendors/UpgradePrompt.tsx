"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { upgradePromptCopy } from "@/lib/upgrade-copy";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/constants";

/**
 * The "you're at your plan's contractor limit" upgrade view — headline,
 * subcopy, and a grid of eligible plans, all driven by lib/upgrade-copy.ts.
 * Shared by AddVendorDialog and BulkUploadDialog so both surface the
 * exact same upgrade experience.
 */
export function UpgradePrompt({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const { headline, subcopy, plans } = upgradePromptCopy(plan);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function checkout(planId: string) {
    setCheckingOut(planId);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout unavailable");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Checkout unavailable");
      setCheckingOut(null);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
        <p className="font-semibold text-green-800">{headline}</p>
        <p className="mt-1 text-green-700">{subcopy}</p>
      </div>

      <div
        className={cn(
          "grid gap-2",
          plans.length === 1 ? "justify-items-center" : "sm:grid-cols-2"
        )}
      >
        {plans.map((p) => (
          <div
            key={p.id}
            className={cn(
              "flex flex-col rounded-lg border p-3",
              plans.length === 1 && "w-full max-w-xs"
            )}
          >
            <div className="flex items-baseline justify-between gap-1">
              <span className="font-semibold">{p.name}</span>
              <span className="text-sm font-medium">
                ${p.priceYearly}
                <span className="text-muted-foreground">/yr</span>
              </span>
            </div>
            <p className="mt-1 flex-1 text-xs text-muted-foreground">
              {p.vendorLimit === null
                ? "Unlimited contractors"
                : `Up to ${p.vendorLimit} contractors`}
            </p>
            <Button
              size="sm"
              className="mt-2"
              onClick={() => checkout(p.id)}
              disabled={checkingOut !== null}
            >
              {checkingOut === p.id ? (
                "Redirecting…"
              ) : (
                <>
                  Choose {p.name} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        ))}
      </div>

      {checkoutError && (
        <p className="text-sm text-destructive">{checkoutError}</p>
      )}

      <DialogFooter className="sm:justify-end">
        <Button variant="outline" onClick={onClose} disabled={checkingOut !== null}>
          Maybe later
        </Button>
      </DialogFooter>
    </div>
  );
}
