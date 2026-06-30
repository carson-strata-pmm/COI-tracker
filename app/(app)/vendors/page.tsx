import { Users } from "lucide-react";
import { VendorTable } from "@/components/dashboard/VendorTable";
import { AddVendorDialog } from "@/components/vendors/AddVendorDialog";
import { EmptyState } from "@/components/EmptyState";
import { DbNotice } from "@/components/DbNotice";
import { getVendorsWithCerts, isDbConfigured } from "@/lib/queries";
import { requireActiveOrg } from "@/lib/guards";
import { planConfig } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const org = await requireActiveOrg();
  const vendors = await getVendorsWithCerts();
  const plan = planConfig(org.plan);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="text-sm text-muted-foreground">
            {vendors.length} vendor{vendors.length === 1 ? "" : "s"}
            {plan.vendorLimit !== null && ` of ${plan.vendorLimit} on your plan`}
            .
          </p>
        </div>
        {vendors.length > 0 && <AddVendorDialog />}
      </div>

      {!isDbConfigured() && <DbNotice />}

      {vendors.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No vendors yet"
          description="Add a vendor or subcontractor to start tracking their certificate of insurance."
          action={<AddVendorDialog />}
        />
      ) : (
        <VendorTable vendors={vendors} showAiColumn={true} />
      )}
    </div>
  );
}
