"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { upgradePromptCopy } from "@/lib/upgrade-copy";
import { cn } from "@/lib/utils";
import { CONTACT_SALES_URL, priceForPeriod, type BillingPeriod, type Plan } from "@/lib/constants";

/**
 * The "you're at your plan's contractor limit" upgrade view — headline,
 * subcopy, a monthly/annual toggle, and a grid of eligible plans, all
 * driven by lib/upgrade-copy.ts. Unlimited is always shown as a final
 * "contact us" option, never a Stripe checkout. Shared by AddVendorDialog
 * and BulkUploadDialog so both surface the exact same upgrade experience.
 */
export function UpgradePrompt({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const { headline, subcopy, plans } = upgradePromptCopy(plan);
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function checkout(planId: string) {
    setCheckingOut(planId);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId, billingPeriod: period }),
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

      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border p-1 text-sm">
          <button
            type="button"
            onClick={() => setPeriod("monthly")}
            className={cn(
              "rounded-md px-3 py-1 transition-colors",
              period === "monthly" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setPeriod("annual")}
            className={cn(
              "rounded-md px-3 py-1 transition-colors",
              period === "annual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            )}
          >
            Annual — save 2 months
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {plans.map((p) => {
          const price = priceForPeriod(p.id, period);
          return (
            <div key={p.id} className="flex flex-col rounded-lg border p-3">
              <div className="flex items-baseline justify-between gap-1">
                <span className="font-semibold">{p.name}</span>
                <span className="text-sm font-medium">
                  ${price}
                  <span className="text-muted-foreground">/{period === "monthly" ? "mo" : "yr"}</span>
                </span>
              </div>
              <p className="mt-1 flex-1 text-xs text-muted-foreground">
                Up to {p.vendorLimit} contractors
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
          );
        })}

        <div className="flex flex-col rounded-lg border p-3">
          <div className="flex items-baseline justify-between gap-1">
            <span className="font-semibold">Unlimited</span>
            <span className="text-sm font-medium text-muted-foreground">Contact us</span>
          </div>
          <p className="mt-1 flex-1 text-xs text-muted-foreground">No contractor limit</p>
          <Button size="sm" variant="outline" className="mt-2" asChild>
            <a href={CONTACT_SALES_URL}>
              Get in touch <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
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
