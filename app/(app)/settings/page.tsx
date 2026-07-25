import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrgSettingsForm } from "@/components/settings/OrgSettingsForm";
import { BillingControls } from "@/components/settings/BillingControls";
import { DbNotice } from "@/components/DbNotice";
import { isDbConfigured } from "@/lib/queries";
import { requireActiveOrg } from "@/lib/guards";
import { planConfig } from "@/lib/constants";
import { getStripe, hasStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

async function getRenewalDate(subscriptionId: string | null): Promise<string | null> {
  if (!subscriptionId || !hasStripe()) return null;
  try {
    const sub = await getStripe().subscriptions.retrieve(subscriptionId);
    return new Date(sub.current_period_end * 1000).toISOString();
  } catch {
    return null;
  }
}

export default async function SettingsPage() {
  const org = await requireActiveOrg();
  const plan = planConfig(org.plan);
  const renewalDate = await getRenewalDate(org.stripe_subscription_id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your organization and plan.
        </p>
      </div>

      {!isDbConfigured() && <DbNotice />}

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>
            Your business name and industry. Industry helps tailor AI
            compliance review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrgSettingsForm org={org} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan &amp; billing</CardTitle>
          <CardDescription>
            You&apos;re on the {plan.name} plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BillingControls
            currentPlan={org.plan}
            currentBillingPeriod={org.billing_period}
            renewalDate={renewalDate}
          />
        </CardContent>
      </Card>
    </div>
  );
}
