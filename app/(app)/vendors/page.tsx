import { Users } from "lucide-react";
import { VendorTable } from "@/components/dashboard/VendorTable";
import { AddVendorDialog } from "@/components/vendors/AddVendorDialog";
import { EmptyState } from "@/components/EmptyState";
import { DbNotice } from "@/components/DbNotice";
import { getVendorsWithCerts, getVendorTypeOptions, isDbConfigured } from "@/lib/queries";
import { requireActiveOrg } from "@/lib/guards";
import { planConfig } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const org = await requireActiveOrg();
  const [vendors, vendorTypes] = await Promise.all([
    getVendorsWithCerts(),
    getVendorTypeOptions(),
  ]);
  const plan = planConfig(org.plan);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contractors</h1>
          <p className="text-sm text-muted-foreground">
            {vendors.length} contractor{vendors.length === 1 ? "" : "s"}
            {plan.vendorLimit !== null && ` of ${plan.vendorLimit} on your plan`}
            .
          </p>
        </div>
        {vendors.length > 0 && <AddVendorDialog vendorTypes={vendorTypes} />}
      </div>

      {!isDbConfigured() && <DbNotice />}

      {vendors.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contractors yet"
          description="Add a contractor or subcontractor to start tracking their certificate of insurance."
          action={<AddVendorDialog vendorTypes={vendorTypes} />}
        />
      ) : (
        <VendorTable vendors={vendors} showAiColumn={true} />
      )}
    </div>
  );
}
