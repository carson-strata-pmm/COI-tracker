import { PAID_PLANS, PLAN_ORDER, planConfig, type Plan, type PlanConfig } from "@/lib/constants";

/** True once vendorCount has reached (or passed) the plan's contractor limit. */
export function isAtVendorLimit(plan: Plan, vendorCount: number): boolean {
  const limit = planConfig(plan).vendorLimit;
  return limit !== null && vendorCount >= limit;
}

export interface UpgradePromptCopy {
  headline: string;
  subcopy: string;
  /** Every plan with a higher contractor limit than `plan` — never the current plan or a lower one. */
  plans: PlanConfig[];
}

const THRESHOLD_COPY: Record<Exclude<Plan, "unlimited">, { headline: string; subcopy: string }> = {
  free: {
    headline: "Nice — your first contractor is tracked!",
    subcopy: "Ready to add more? Pick the plan that fits your business.",
  },
  solo: {
    headline: "You've tracked 10 contractors — time to grow.",
    subcopy: "Upgrade to keep adding contractors — takes 30 seconds.",
  },
  crew: {
    headline: "Your crew just hit 30 — you're running a real operation.",
    subcopy: "Upgrade to keep your whole team covered.",
  },
  outfit: {
    headline: "50 contractors tracked. Only one plan left — Unlimited.",
    subcopy: "Upgrade to Unlimited and never hit a limit again.",
  },
};

/** Dynamic headline/subcopy and the eligible upgrade plans for the "at limit" modal. */
export function upgradePromptCopy(plan: Plan): UpgradePromptCopy {
  const currentIdx = PLAN_ORDER.indexOf(plan);
  const plans = PAID_PLANS.filter((p) => PLAN_ORDER.indexOf(p.id) > currentIdx);
  const copy =
    plan === "unlimited"
      ? { headline: "You've reached your plan's contractor limit.", subcopy: "Upgrade to add more." }
      : THRESHOLD_COPY[plan];
  return { ...copy, plans };
}
