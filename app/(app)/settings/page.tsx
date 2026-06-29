import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrgSettingsForm } from "@/components/settings/OrgSettingsForm";
import { DbNotice } from "@/components/DbNotice";
import { getOrg, isDbConfigured } from "@/lib/queries";
import { PLANS, planConfig } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const org = await getOrg();
  const plan = planConfig(org.plan);

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
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {Object.values(PLANS).map((p) => (
              <div
                key={p.id}
                className={`rounded-lg border p-4 ${
                  p.id === org.plan ? "border-primary ring-1 ring-primary" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.name}</span>
                  {p.id === org.plan && <Badge>Current</Badge>}
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  ${p.priceMonthly}
                  <span className="text-sm font-normal text-muted-foreground">
                    /mo
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {p.vendorLimit === null
                    ? "Unlimited vendors"
                    : `Up to ${p.vendorLimit} vendors`}
                  {p.aiReview && " · AI compliance review"}
                </p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Self-serve billing via Stripe is added in Phase 9.
          </p>
          <Button variant="outline" disabled>
            Manage billing (coming soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
