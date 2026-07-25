import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AuthForm } from "@/components/auth/AuthForm";
import {
  isBillingPeriod,
  isSelfServePlan,
  planConfig,
  priceForPeriod,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { plan?: string; billing?: string };
}) {
  const plan = isSelfServePlan(searchParams.plan) ? searchParams.plan : null;
  const billing = isBillingPeriod(searchParams.billing) ? searchParams.billing : "monthly";
  const price = plan ? priceForPeriod(plan, billing) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Start tracking contractor COIs in under two minutes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {plan && price !== null && (
          <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
            <p className="font-medium">
              You&apos;re signing up for CertTrack {planConfig(plan).name} — $
              {price}/{billing === "monthly" ? "mo" : "yr"}
            </p>
            <p className="mt-1 text-muted-foreground">
              Create your account below to complete your purchase.
            </p>
          </div>
        )}
        <Suspense>
          <AuthForm
            mode="signup"
            plan={plan ?? undefined}
            billing={plan ? billing : undefined}
          />
        </Suspense>
      </CardContent>
    </Card>
  );
}
