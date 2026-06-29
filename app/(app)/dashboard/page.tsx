import { Users } from "lucide-react";
import { ComplianceSummary } from "@/components/dashboard/ComplianceSummary";
import { VendorTable } from "@/components/dashboard/VendorTable";
import { AddVendorDialog } from "@/components/vendors/AddVendorDialog";
import { EmptyState } from "@/components/EmptyState";
import { DbNotice } from "@/components/DbNotice";
import { getOrg, getVendorsWithCerts, isDbConfigured } from "@/lib/queries";
import { planConfig } from "@/lib/constants";

// DB-backed; never freeze fixture/seed data at build time.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [org, vendors] = await Promise.all([
    getOrg(),
    getVendorsWithCerts(),
  ]);
  const plan = planConfig(org.plan);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Compliance overview across all your vendors.
          </p>
        </div>
        {vendors.length > 0 && <AddVendorDialog />}
      </div>

      {!isDbConfigured() && <DbNotice />}

      {vendors.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Add your first vendor"
          description="Start tracking certificates of insurance by adding a vendor or subcontractor."
          action={<AddVendorDialog />}
        />
      ) : (
        <>
          <ComplianceSummary vendors={vendors} />
          <VendorTable vendors={vendors} showAiColumn={plan.aiReview} />
        </>
      )}
    </div>
  );
}
