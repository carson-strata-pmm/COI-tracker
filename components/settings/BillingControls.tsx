"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLANS, type Plan } from "@/lib/constants";

/**
 * Plan grid with self-serve upgrade (Stripe Checkout) and a manage-
 * billing button (Stripe Customer Portal). Falls back to a disabled
 * state with a message if Stripe isn't configured (the endpoints
 * return 503).
 */
export function BillingControls({ currentPlan }: { currentPlan: Plan }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function checkout(plan: Plan) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Checkout unavailable");
        if (data.url) window.location.href = data.url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Checkout unavailable");
      }
    });
  }

  function portal() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/stripe/portal", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Billing portal unavailable");
        if (data.url) window.location.href = data.url;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Billing portal unavailable");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {Object.values(PLANS).map((p) => {
          const isCurrent = p.id === currentPlan;
          const canUpgrade = !isCurrent && p.id !== "free";
          return (
            <div
              key={p.id}
              className={`flex flex-col rounded-lg border p-4 ${
                isCurrent ? "border-primary ring-1 ring-primary" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{p.name}</span>
                {isCurrent && <Badge>Current</Badge>}
              </div>
              <div className="mt-1 text-2xl font-semibold">
                ${p.priceMonthly}
                <span className="text-sm font-normal text-muted-foreground">
                  /mo
                </span>
              </div>
              <p className="mt-2 flex-1 text-xs text-muted-foreground">
                {p.vendorLimit === null
                  ? "Unlimited vendors"
                  : `Up to ${p.vendorLimit} vendors`}
                {p.aiReview && " · AI compliance review"}
              </p>
              {canUpgrade && (
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => checkout(p.id)}
                  disabled={pending}
                >
                  Upgrade to {p.name}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button variant="outline" onClick={portal} disabled={pending}>
        Manage billing
      </Button>
    </div>
  );
}
