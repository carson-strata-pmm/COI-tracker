"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createOrg, type ActionResult } from "@/app/onboarding/actions";
import { INDUSTRY_TYPES, type BillingPeriod, type Plan } from "@/lib/constants";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creating…" : "Create organization"}
    </Button>
  );
}

export function OnboardingForm({
  plan,
  billing,
}: {
  /** An intended paid plan carried from signup, if any — takes the user to checkout instead of the dashboard. */
  plan?: Plan;
  billing?: BillingPeriod;
}) {
  const router = useRouter();
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    createOrg,
    null
  );

  useEffect(() => {
    if (state?.ok) {
      // The org didn't exist yet when signup ran, so it couldn't check
      // out then — this is the first point an org id exists. Prefer
      // the plan carried via URL (survives cross-tab/cross-device
      // email confirmation); sessionStorage is a same-tab fallback.
      const intendedPlan = plan ?? sessionStorage.getItem("intended_plan");
      const intendedBilling = billing ?? sessionStorage.getItem("intended_billing");
      sessionStorage.removeItem("intended_plan");
      sessionStorage.removeItem("intended_billing");

      if (intendedPlan && intendedBilling) {
        router.push(`/checkout?plan=${intendedPlan}&billing=${intendedBilling}`);
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    }
  }, [state, router, plan, billing]);

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Organization name</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="Acme General Contracting"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="industry_type">Industry</Label>
        <Select name="industry_type">
          <SelectTrigger>
            <SelectValue placeholder="Select an industry" />
          </SelectTrigger>
          <SelectContent>
            {INDUSTRY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <SubmitButton />
    </form>
  );
}
