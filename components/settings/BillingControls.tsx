"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CONTACT_SALES_URL,
  PAID_PLANS,
  PLAN_ORDER,
  planConfig,
  priceForPeriod,
  type BillingPeriod,
  type Plan,
} from "@/lib/constants";

export function BillingControls({
  currentPlan,
  currentBillingPeriod,
  renewalDate,
}: {
  currentPlan: Plan;
  currentBillingPeriod: BillingPeriod;
  renewalDate: string | null;
}) {
  // Tracks which single plan's button is mid-checkout, so only that
  // button shows a pending state instead of dimming every button.
  const [checkingOut, setCheckingOut] = useState<Plan | null>(null);
  const [portalPending, setPortalPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  async function checkout(plan: Plan) {
    if (checkingOut) return;
    setError(null);
    setCheckingOut(plan);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billingPeriod: period }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout unavailable");
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setCheckingOut(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout unavailable");
      setCheckingOut(null);
    }
  }

  async function portal() {
    if (portalPending) return;
    setError(null);
    setPortalPending(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Billing portal unavailable");
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setPortalPending(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Billing portal unavailable");
      setPortalPending(false);
    }
  }

  const currentIdx = PLAN_ORDER.indexOf(currentPlan);
  const current = planConfig(currentPlan);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-3 text-sm">
        <p>
          You&apos;re on the <span className="font-medium">{current.name}</span> plan
          {current.pricing && (
            <>
              , billed <span className="font-medium">{currentBillingPeriod}</span>
            </>
          )}
          .
        </p>
        {renewalDate && (
          <p className="mt-1 text-muted-foreground">
            Renews on{" "}
            {new Date(renewalDate).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            .
          </p>
        )}
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PAID_PLANS.map((p) => {
          const isCurrent = p.id === currentPlan;
          const isUpgrade = PLAN_ORDER.indexOf(p.id) > currentIdx;
          const price = priceForPeriod(p.id, period);

          return (
            <div
              key={p.id}
              className={`flex flex-col rounded-lg border p-4 ${
                isCurrent ? "border-primary ring-1 ring-primary" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{p.name}</span>
                {isCurrent && <Badge>Current</Badge>}
              </div>
              <div className="mt-1 text-2xl font-semibold">
                ${price}
                <span className="text-sm font-normal text-muted-foreground">
                  /{period === "monthly" ? "mo" : "yr"}
                </span>
              </div>
              <p className="mt-2 flex-1 text-xs text-muted-foreground">
                Up to {p.vendorLimit} contractors
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-green-600 shrink-0" />
                  AI compliance review
                </li>
              </ul>
              {isUpgrade && (
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => checkout(p.id)}
                  disabled={checkingOut === p.id}
                >
                  {checkingOut === p.id ? "Redirecting…" : `Upgrade to ${p.name}`}
                </Button>
              )}
            </div>
          );
        })}

        <div className="flex flex-col rounded-lg border p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">Unlimited</span>
            {currentPlan === "unlimited" && <Badge>Current</Badge>}
          </div>
          <div className="mt-1 text-2xl font-semibold text-muted-foreground">
            Contact us
          </div>
          <p className="mt-2 flex-1 text-xs text-muted-foreground">
            No contractor limit
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-green-600 shrink-0" />
              AI compliance review
            </li>
          </ul>
          <Button size="sm" variant="outline" className="mt-3" asChild>
            <a href={CONTACT_SALES_URL}>Get in touch →</a>
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button variant="outline" onClick={portal} disabled={portalPending}>
        {portalPending ? "Redirecting…" : "Manage billing"}
      </Button>
    </div>
  );
}
