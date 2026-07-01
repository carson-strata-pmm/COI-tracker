import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OrgSettingsForm } from "@/components/settings/OrgSettingsForm";
import { BillingControls } from "@/components/settings/BillingControls";
import { CoverageRequirements } from "@/components/settings/CoverageRequirements";
import { DbNotice } from "@/components/DbNotice";
import { isDbConfigured, getResolvedRequirements } from "@/lib/queries";
import { requireActiveOrg } from "@/lib/guards";
import { planConfig } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const org = await requireActiveOrg();
  const plan = planConfig(org.plan);
  const requirements = await getResolvedRequirements();

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
          <BillingControls currentPlan={org.plan} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Coverage requirements</CardTitle>
          <CardDescription>
            Minimum insurance limits checked during AI review. Defaults are
            market-standard; override any row to match your contracts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CoverageRequirements requirements={requirements} />
        </CardContent>
      </Card>
    </div>
  );
}
