import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, User, Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { COIHistory } from "@/components/vendors/COIHistory";
import { AIReportCard } from "@/components/vendors/AIReportCard";
import { EditVendorDialog } from "@/components/vendors/EditVendorDialog";
import { DeleteVendorButton } from "@/components/vendors/DeleteVendorButton";
import { UploadCoiDialog } from "@/components/vendors/UploadCoiDialog";
import { RequestCoiButton } from "@/components/vendors/RequestCoiButton";
import { DbNotice } from "@/components/DbNotice";
import {
  getOrg,
  getVendor,
  getVendorCertificates,
  getAIReviewForCert,
  isDbConfigured,
} from "@/lib/queries";
import { latestCertificate } from "@/lib/status";
import { planConfig } from "@/lib/constants";
import { formatDate, formatMoney, humanizeKey } from "@/lib/format";

export default async function VendorDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [vendor, org, certs] = await Promise.all([
    getVendor(params.id),
    getOrg(),
    getVendorCertificates(params.id),
  ]);
  if (!vendor) notFound();

  const plan = planConfig(org.plan);
  const current = latestCertificate(certs);
  const review =
    plan.aiReview && current ? await getAIReviewForCert(current.id) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/vendors"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to vendors
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">
              {vendor.company_name}
            </h1>
            <StatusBadge status={vendor.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {vendor.vendor_type && (
              <span className="flex items-center gap-1">
                <Shield className="h-3.5 w-3.5" /> {vendor.vendor_type}
              </span>
            )}
            {vendor.contact_name && (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> {vendor.contact_name}
              </span>
            )}
            {vendor.contact_email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {vendor.contact_email}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <UploadCoiDialog vendorId={vendor.id} />
          <EditVendorDialog vendor={vendor} />
          <DeleteVendorButton
            vendorId={vendor.id}
            vendorName={vendor.company_name}
            redirectTo="/vendors"
          />
        </div>
      </div>

      {!isDbConfigured() && <DbNotice />}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Current certificate</CardTitle>
            </CardHeader>
            <CardContent>
              {current ? (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                  <Field label="Named insured" value={current.named_insured} />
                  <Field label="Insurer" value={current.insurer_name} />
                  <Field label="Policy #" value={current.policy_number} />
                  <Field
                    label="Effective"
                    value={formatDate(current.effective_date)}
                  />
                  <Field
                    label="Expires"
                    value={formatDate(current.expiration_date)}
                  />
                  <Field
                    label="Additional insured"
                    value={
                      current.additional_insured === null
                        ? "—"
                        : current.additional_insured
                          ? "Yes"
                          : "No"
                    }
                  />
                  <div className="col-span-2">
                    <dt className="text-muted-foreground">Coverage</dt>
                    <dd className="mt-1 flex flex-wrap gap-1">
                      {(current.coverage_types ?? []).length === 0 ? (
                        <span>—</span>
                      ) : (
                        current.coverage_types!.map((c) => (
                          <span
                            key={c}
                            className="rounded bg-muted px-2 py-0.5 text-xs"
                          >
                            {c}
                          </span>
                        ))
                      )}
                    </dd>
                  </div>
                  {current.limits &&
                    Object.keys(current.limits).length > 0 && (
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">Limits</dt>
                        <dd className="mt-1 grid grid-cols-2 gap-1">
                          {Object.entries(current.limits).map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-2">
                              <span className="text-muted-foreground">
                                {humanizeKey(k)}
                              </span>
                              <span className="font-medium">
                                {formatMoney(v)}
                              </span>
                            </div>
                          ))}
                        </dd>
                      </div>
                    )}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No certificate on file. Upload one or request it from the
                  vendor.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Certificate history</CardTitle>
            </CardHeader>
            <CardContent>
              <COIHistory certs={certs} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request a COI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Send {vendor.company_name} a secure link to upload their
                certificate — no account required.
              </p>
              <RequestCoiButton vendorId={vendor.id} size="default" />
            </CardContent>
          </Card>

          {plan.aiReview && <AIReportCard review={review} />}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || "—"}</dd>
    </div>
  );
}
