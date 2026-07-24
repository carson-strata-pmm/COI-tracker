import { Users } from "lucide-react";
import { ComplianceSummary } from "@/components/dashboard/ComplianceSummary";
import { VendorTable } from "@/components/dashboard/VendorTable";
import { AddVendorDialog } from "@/components/vendors/AddVendorDialog";
import { BulkUploadDialog } from "@/components/vendors/BulkUploadDialog";
import { EmptyState } from "@/components/EmptyState";
import { DbNotice } from "@/components/DbNotice";
import { getVendorsWithCerts, getVendorTypeOptions, isDbConfigured } from "@/lib/queries";
import { requireActiveOrg } from "@/lib/guards";

// DB-backed; never freeze fixture/seed data at build time.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const org = await requireActiveOrg();
  const [vendors, vendorTypes] = await Promise.all([
    getVendorsWithCerts(),
    getVendorTypeOptions(),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Compliance overview across all your contractors.
          </p>
        </div>
        {vendors.length > 0 && (
          <div className="flex items-center gap-2">
            <AddVendorDialog
              vendorTypes={vendorTypes}
              plan={org.plan}
              vendorCount={vendors.length}
            />
            <BulkUploadDialog
              vendorTypes={vendorTypes}
              plan={org.plan}
              vendorCount={vendors.length}
              existingVendorNames={vendors.map((v) => v.company_name)}
            />
          </div>
        )}
      </div>

      {!isDbConfigured() && <DbNotice />}

      {vendors.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Add your first contractor"
          description="Start tracking certificates of insurance by adding a contractor or subcontractor."
          action={
            <AddVendorDialog
              vendorTypes={vendorTypes}
              plan={org.plan}
              vendorCount={vendors.length}
            />
          }
        />
      ) : (
        <>
          <ComplianceSummary vendors={vendors} />
          <VendorTable vendors={vendors} showAiColumn={true} />
        </>
      )}
    </div>
  );
}
