"use client";

import { useState, useTransition } from "react";
import { Pencil, RotateCcw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  saveCoverageRequirement,
  resetCoverageRequirement,
} from "@/app/(app)/settings/actions";
import type { ResolvedRequirement } from "@/lib/types";

export function CoverageRequirements({
  requirements,
}: {
  requirements: ResolvedRequirement[];
}) {
  const [editing, setEditing] = useState<ResolvedRequirement | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function openEdit(req: ResolvedRequirement) {
    setSuccessMsg(null);
    setErrorMsg(null);
    setEditing(req);
  }

  function handleSaved(msg: string) {
    setEditing(null);
    setSuccessMsg(msg);
  }

  function handleError(msg: string) {
    setErrorMsg(msg);
  }

  if (requirements.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Run the migration in Supabase to load coverage rules.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Pre-set to market-standard minimums. Adjust any row to match your
        contracts or broker&apos;s recommendations — changes take effect on the
        next AI review for that vendor type.
      </p>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <Check className="h-4 w-4 shrink-0" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <X className="h-4 w-4 shrink-0" /> {errorMsg}
        </div>
      )}

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Vendor type</th>
              <th className="px-3 py-2 text-right font-medium">GL occ.</th>
              <th className="px-3 py-2 text-right font-medium">GL agg.</th>
              <th className="px-3 py-2 text-center font-medium">W.Comp</th>
              <th className="px-3 py-2 text-center font-medium">Auto</th>
              <th className="px-3 py-2 text-center font-medium">Umbrella</th>
              <th className="px-3 py-2 text-center font-medium">Add. ins.</th>
              <th className="px-3 py-2 text-center font-medium">Waiver</th>
              <th className="px-3 py-2 text-center font-medium">Source</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {requirements.map((req) => (
              <tr key={req.vendor_type} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium">{req.vendor_type}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {req.gl_per_occurrence_min !== null
                    ? `$${(req.gl_per_occurrence_min / 1000000).toFixed(0)}M`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {req.gl_aggregate_min !== null
                    ? `$${(req.gl_aggregate_min / 1000000).toFixed(0)}M`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-center">
                  <BoolCell value={req.workers_comp_required} />
                </td>
                <td className="px-3 py-2 text-center">
                  <BoolCell value={req.auto_required} />
                </td>
                <td className="px-3 py-2 text-center">
                  <BoolCell value={req.umbrella_required} />
                </td>
                <td className="px-3 py-2 text-center">
                  <BoolCell value={req.additional_insured_required} />
                </td>
                <td className="px-3 py-2 text-center">
                  <BoolCell value={req.waiver_of_subrogation_required} />
                </td>
                <td className="px-3 py-2 text-center">
                  {req.hasCustomOverride ? (
                    <Badge variant="default" className="text-xs">Custom</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Default</Badge>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => openEdit(req)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="sr-only">Edit {req.vendor_type}</span>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditModal
          req={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          onError={handleError}
        />
      )}
    </div>
  );
}

function BoolCell({ value }: { value: boolean }) {
  return value ? (
    <Check className="mx-auto h-4 w-4 text-green-600" />
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}

// ─────────────────────────────────────────────────────────────
// Edit modal
// ─────────────────────────────────────────────────────────────

function EditModal({
  req,
  onClose,
  onSaved,
  onError,
}: {
  req: ResolvedRequirement;
  onClose: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [workers, setWorkers] = useState(req.workers_comp_required);
  const [auto, setAuto] = useState(req.auto_required);
  const [umbrella, setUmbrella] = useState(req.umbrella_required);
  const [addIns, setAddIns] = useState(req.additional_insured_required);
  const [waiver, setWaiver] = useState(req.waiver_of_subrogation_required);

  function handleSave(formData: FormData) {
    formData.set("workers_comp_required", String(workers));
    formData.set("auto_required", String(auto));
    formData.set("umbrella_required", String(umbrella));
    formData.set("additional_insured_required", String(addIns));
    formData.set("waiver_of_subrogation_required", String(waiver));

    startTransition(async () => {
      const result = await saveCoverageRequirement(req.vendor_type, formData);
      if (result.ok) {
        const msg =
          result.rereviewed > 0
            ? `Saved. ${result.rereviewed} certificate${result.rereviewed === 1 ? "" : "s"} re-reviewed.`
            : "Saved.";
        onSaved(msg);
      } else {
        onError(result.error);
        onClose();
      }
    });
  }

  function handleReset() {
    startTransition(async () => {
      const result = await resetCoverageRequirement(req.vendor_type);
      if (result.ok) {
        const msg =
          result.rereviewed > 0
            ? `Reset to default. ${result.rereviewed} certificate${result.rereviewed === 1 ? "" : "s"} re-reviewed.`
            : "Reset to default.";
        onSaved(msg);
      } else {
        onError(result.error);
        onClose();
      }
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit coverage rules — {req.vendor_type}</DialogTitle>
          <DialogDescription>
            Adjustments apply to your org only and take effect on the next AI
            review for this vendor type.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSave} className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <MoneyField
              label="GL per occurrence"
              name="gl_per_occurrence_min"
              defaultValue={req.gl_per_occurrence_min}
            />
            <MoneyField
              label="GL aggregate"
              name="gl_aggregate_min"
              defaultValue={req.gl_aggregate_min}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <ToggleField
                label="Workers comp required"
                checked={workers}
                onChange={setWorkers}
              />
              <ToggleField
                label="Auto required"
                checked={auto}
                onChange={setAuto}
              />
              <ToggleField
                label="Umbrella required"
                checked={umbrella}
                onChange={setUmbrella}
              />
            </div>
            <div className="space-y-3">
              <ToggleField
                label="Additional insured"
                checked={addIns}
                onChange={setAddIns}
              />
              <ToggleField
                label="Waiver of subrogation"
                checked={waiver}
                onChange={setWaiver}
              />
            </div>
          </div>

          {auto && (
            <MoneyField
              label="Auto minimum"
              name="auto_min"
              defaultValue={req.auto_min}
            />
          )}
          {umbrella && (
            <MoneyField
              label="Umbrella minimum"
              name="umbrella_min"
              defaultValue={req.umbrella_min}
            />
          )}

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {req.hasCustomOverride && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={pending}
                className="gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset to default
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MoneyField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: number | null;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={name} className="text-xs">
        {label}
      </Label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
          $
        </span>
        <Input
          id={name}
          name={name}
          type="number"
          min="0"
          step="1"
          defaultValue={defaultValue ?? ""}
          className="pl-6"
          placeholder="0"
        />
      </div>
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-2">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
          checked ? "bg-primary" : "bg-input"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}
