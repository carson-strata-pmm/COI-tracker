"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLANS, PLAN_ORDER, type Plan } from "@/lib/constants";

export function BillingControls({ currentPlan }: { currentPlan: Plan }) {
  // Tracks which single plan's button is mid-checkout, so only that
  // button shows a pending state instead of dimming every button.
  const [checkingOut, setCheckingOut] = useState<Plan | null>(null);
  const [portalPending, setPortalPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout(plan: Plan) {
    if (checkingOut) return;
    setError(null);
    setCheckingOut(plan);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const isCurrent = id === currentPlan;
          const isUpgrade = PLAN_ORDER.indexOf(id) > currentIdx;

          return (
            <div
              key={id}
              className={`flex flex-col rounded-lg border p-4 ${
                isCurrent ? "border-primary ring-1 ring-primary" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{p.name}</span>
                {isCurrent && <Badge>Current</Badge>}
              </div>
              <div className="mt-1 text-2xl font-semibold">
                ${p.priceYearly}
                <span className="text-sm font-normal text-muted-foreground">
                  /yr
                </span>
              </div>
              <p className="mt-2 flex-1 text-xs text-muted-foreground">
                {p.vendorLimit === null
                  ? "Unlimited contractors"
                  : `Up to ${p.vendorLimit} contractors`}
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
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button variant="outline" onClick={portal} disabled={portalPending}>
        {portalPending ? "Redirecting…" : "Manage billing"}
      </Button>
    </div>
  );
}
