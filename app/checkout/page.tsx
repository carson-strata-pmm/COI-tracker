import { redirect } from "next/navigation";
import { requireActiveOrg } from "@/lib/guards";
import { getAuthUser } from "@/lib/auth";
import { hasStripe } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/checkout";
import { isBillingPeriod, isSelfServePlan } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * Signup-with-plan redirect step: lands here right after onboarding
 * (org now exists, so a Stripe customer/session can be created) and
 * immediately redirects into Stripe Checkout. loading.tsx supplies the
 * "Setting up your plan…" state shown while this resolves.
 */
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { plan?: string; billing?: string };
}) {
  const plan = searchParams.plan;
  const billing = searchParams.billing;

  if (!isSelfServePlan(plan) || !isBillingPeriod(billing) || !hasStripe()) {
    redirect("/dashboard");
  }

  const org = await requireActiveOrg();
  const user = await getAuthUser();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const result = await createCheckoutSession({
    orgId: org.id,
    plan,
    billingPeriod: billing,
    customerEmail: user?.email,
    successUrl: `${appUrl}/dashboard?upgraded=true`,
    cancelUrl: `${appUrl}/dashboard`,
  });

  redirect("error" in result ? "/dashboard" : result.url);
}
