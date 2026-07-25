import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OnboardingForm } from "@/components/auth/OnboardingForm";
import { getAuthUser, getActiveOrgId } from "@/lib/auth";
import { isBillingPeriod, isSelfServePlan } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { plan?: string; billing?: string };
}) {
  const user = await getAuthUser();
  if (!user) redirect("/auth/login");

  const plan = isSelfServePlan(searchParams.plan) ? searchParams.plan : null;
  const billing = isBillingPeriod(searchParams.billing) ? searchParams.billing : "monthly";

  // Already onboarded — go straight to checkout if a plan was intended,
  // otherwise the dashboard.
  const orgId = await getActiveOrgId();
  if (orgId) redirect(plan ? `/checkout?plan=${plan}&billing=${billing}` : "/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold tracking-tight">CertTrack</span>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Set up your organization</CardTitle>
            <CardDescription>
              Tell us about your business. You can change this later in
              settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm plan={plan ?? undefined} billing={plan ? billing : undefined} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
