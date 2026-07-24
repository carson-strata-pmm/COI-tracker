"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UpgradePrompt } from "@/components/vendors/UpgradePrompt";
import { bulkAddVendors, type BulkVendorRow } from "@/app/(app)/vendors/actions";
import {
  validateRows,
  applyPlanLimit,
  type ParsedVendorRow,
} from "@/lib/csv-vendor-import";
import { planConfig, type Plan } from "@/lib/constants";
import { upgradePromptCopy } from "@/lib/upgrade-copy";
import { cn } from "@/lib/utils";

type Step = "upload" | "preview" | "upgrade" | "success";

export function BulkUploadDialog({
  vendorTypes,
  plan,
  vendorCount,
  existingVendorNames,
}: {
  vendorTypes: string[];
  plan: Plan;
  vendorCount: number;
  existingVendorNames: string[];
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedVendorRow[]>([]);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ inserted: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function reset() {
    setStep("upload");
    setDragging(false);
    setFileError(null);
    setRows([]);
    setResult(null);
    setImportError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    setOpen(next);
  }

  function handleFile(file: File | null) {
    setFileError(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Please upload a .csv file");
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (results) => {
        const raw = results.data.filter((r) =>
          Object.values(r).some((v) => (v ?? "").trim() !== "")
        );
        if (raw.length === 0) {
          setFileError("No rows found in this file");
          return;
        }
        const existingLower = new Set(
          existingVendorNames.map((n) => n.toLowerCase())
        );
        const validated = validateRows(raw, vendorTypes, existingLower);
        const limit = planConfig(plan).vendorLimit;
        const availableSlots =
          limit === null ? Infinity : Math.max(0, limit - vendorCount);
        setRows(applyPlanLimit(validated, availableSlots));
        setStep("preview");
      },
      error: () => setFileError("Could not read this file. Please check the format."),
    });
  }

  const errorCount = rows.filter((r) => r.status === "error").length;
  const limitCount = rows.filter((r) => r.status === "limit").length;
  const importableRows = rows.filter(
    (r) => r.status === "ready" || r.status === "warning"
  );
  const importableCount = importableRows.length;

  function handleImport() {
    setImportError(null);
    startTransition(async () => {
      const payload: BulkVendorRow[] = importableRows.map((r) => ({
        company_name: r.company_name,
        vendor_type: r.resolvedType!,
        contact_name: r.contact_name || null,
        contact_email: r.contact_email || null,
        contact_phone: r.contact_phone || null,
      }));
      const res = await bulkAddVendors(payload);
      if (res.ok) {
        setResult({ inserted: res.inserted });
        setStep("success");
        router.refresh();
      } else {
        setImportError(res.error);
      }
    });
  }

  function downloadErrorReport() {
    const skipped = rows.filter((r) => r.status === "error" || r.status === "limit");
    const csv = Papa.unparse(
      skipped.map((r) => ({
        company_name: r.company_name,
        contractor_type: r.contractor_type,
        contact_name: r.contact_name,
        contact_email: r.contact_email,
        contact_phone: r.contact_phone,
        error: r.issue ?? "",
      }))
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "certtrack-import-errors.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const planCfg = planConfig(plan);
  const truncatedByLimit = limitCount > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" /> Bulk upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {step === "upgrade"
              ? upgradePromptCopy(plan).headline
              : step === "success"
                ? "Import complete"
                : "Bulk upload contractors"}
          </DialogTitle>
          {step === "upload" && (
            <DialogDescription>Step 1 of 2 — Upload your CSV</DialogDescription>
          )}
          {step === "preview" && (
            <DialogDescription>
              Step 2 of 2 — Review before importing
            </DialogDescription>
          )}
        </DialogHeader>

        {step === "upload" && (
          <div className="grid gap-4">
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span>1. Download the template</span>
                <Button variant="outline" size="sm" asChild>
                  <a href="/certtrack-vendor-template.csv" download>
                    <Download className="h-3.5 w-3.5" /> Download template
                  </a>
                </Button>
              </div>
              <p>2. Fill in your contractors</p>
              <div className="grid gap-2">
                <span>3. Upload the completed file</span>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    handleFile(e.dataTransfer.files?.[0] ?? null);
                  }}
                  onClick={() => inputRef.current?.click()}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                    dragging
                      ? "border-primary bg-accent"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50"
                  )}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
                  />
                  <FileText className="mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Choose a CSV file, or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supported format: .csv only
                  </p>
                </div>
              </div>
            </div>

            {fileError && <p className="text-sm text-destructive">{fileError}</p>}

            <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">company_name</span>{" "}
                and{" "}
                <span className="font-medium text-foreground">contractor_type</span>{" "}
                are required. Contact fields are optional.
              </p>
              <p className="mt-2 font-medium text-foreground">
                Accepted contractor types:
              </p>
              <p className="mt-1">{vendorTypes.join(", ")}</p>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="font-medium">
                {importableCount} contractor{importableCount === 1 ? "" : "s"} ready
                to import
              </span>
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-3.5 w-3.5" /> {errorCount} row
                  {errorCount === 1 ? "" : "s"} have issues
                </span>
              )}
            </div>

            {truncatedByLimit && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Your {planCfg.name} plan allows {planCfg.vendorLimit} contractors.
                You have {vendorCount} — only {importableCount} of your{" "}
                {importableCount + limitCount} valid rows will be imported.
                Upgrade to import all of them.
                <div className="mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStep("upgrade")}
                  >
                    Upgrade plan →
                  </Button>
                </div>
              </div>
            )}

            <div className="max-h-80 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Company name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.row}>
                      <TableCell className="text-muted-foreground">{r.row}</TableCell>
                      <TableCell className="font-medium">
                        {r.company_name || "—"}
                      </TableCell>
                      <TableCell>{r.contractor_type || "—"}</TableCell>
                      <TableCell>{r.contact_name || "—"}</TableCell>
                      <TableCell>{r.contact_email || "—"}</TableCell>
                      <TableCell>{r.contact_phone || "—"}</TableCell>
                      <TableCell>
                        <RowStatusBadge row={r} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {importError && (
              <p className="text-sm text-destructive">{importError}</p>
            )}

            <DialogFooter className="sm:justify-between">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={pending || importableCount === 0}
              >
                {pending
                  ? "Importing…"
                  : `Import ${importableCount} valid row${importableCount === 1 ? "" : "s"} →`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "upgrade" && (
          <UpgradePrompt plan={plan} onClose={() => setStep("preview")} />
        )}

        {step === "success" && result && (
          <div className="grid gap-4">
            <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <div className="text-sm">
                <p className="font-medium text-green-800">
                  {result.inserted} contractor{result.inserted === 1 ? "" : "s"}{" "}
                  imported successfully
                </p>
                {errorCount > 0 && (
                  <p className="mt-0.5 text-green-700">
                    {errorCount} row{errorCount === 1 ? "" : "s"} skipped due to
                    errors
                  </p>
                )}
                {limitCount > 0 && (
                  <p className="mt-0.5 text-green-700">
                    {limitCount} row{limitCount === 1 ? "" : "s"} skipped due to
                    your plan limit
                  </p>
                )}
              </div>
            </div>

            <DialogFooter className="sm:justify-between">
              {(errorCount > 0 || limitCount > 0) && (
                <Button variant="outline" onClick={downloadErrorReport}>
                  <Download className="h-3.5 w-3.5" /> Download error report
                </Button>
              )}
              <Button asChild>
                <Link href="/vendors" onClick={() => setOpen(false)}>
                  View your contractors
                </Link>
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RowStatusBadge({ row }: { row: ParsedVendorRow }) {
  if (row.status === "ready") {
    return (
      <span className="flex items-center gap-1 whitespace-nowrap text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Ready
      </span>
    );
  }
  if (row.status === "error") {
    return (
      <span className="flex items-center gap-1 whitespace-nowrap text-destructive">
        <XCircle className="h-3.5 w-3.5 shrink-0" /> {row.issue}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 whitespace-nowrap text-amber-700">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {row.issue}
    </span>
  );
}
