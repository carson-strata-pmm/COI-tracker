"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { updateCertificate, type ActionResult } from "@/app/(app)/vendors/actions";
import type { Certificate } from "@/lib/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Confirm & save"}
    </Button>
  );
}

/**
 * Review/edit form for parsed COI fields (Phase 3, Flow 3 step 3–4).
 * Pre-filled with what Textract/Claude extracted; the org corrects
 * anything wrong and confirms. Saving recalculates vendor status.
 */
export function ParsedFieldsForm({
  cert,
  confidence,
  source,
  onSaved,
}: {
  cert: Certificate;
  confidence?: number | null;
  source?: string | null;
  onSaved?: () => void;
}) {
  const action = updateCertificate.bind(null, cert.id);
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    action,
    null
  );

  useEffect(() => {
    if (state?.ok) onSaved?.();
  }, [state, onSaved]);

  const lowConfidence =
    typeof confidence === "number" && confidence > 0 && confidence < 0.75;

  return (
    <form action={formAction} className="grid gap-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Parsed by</span>
        <Badge variant="secondary" className="capitalize">
          {source ?? "manual"}
        </Badge>
        {typeof confidence === "number" && confidence > 0 && (
          <Badge variant={lowConfidence ? "warning" : "muted"}>
            {Math.round(confidence * 100)}% confidence
          </Badge>
        )}
      </div>
      {lowConfidence && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          Low parse confidence — please double-check these fields before saving.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="named_insured"
          label="Named insured"
          defaultValue={cert.named_insured}
        />
        <Field
          name="insurer_name"
          label="Insurer"
          defaultValue={cert.insurer_name}
        />
        <Field
          name="policy_number"
          label="Policy #"
          defaultValue={cert.policy_number}
        />
        <Field
          name="coverage_types"
          label="Coverage types (comma-separated)"
          defaultValue={(cert.coverage_types ?? []).join(", ")}
        />
        <Field
          name="effective_date"
          label="Effective date"
          type="date"
          defaultValue={cert.effective_date}
        />
        <Field
          name="expiration_date"
          label="Expiration date"
          type="date"
          defaultValue={cert.expiration_date}
        />
      </div>

      <div className="flex flex-wrap gap-6">
        <Checkbox
          name="additional_insured"
          label="Additional insured endorsement"
          defaultChecked={Boolean(cert.additional_insured)}
        />
        <Checkbox
          name="waiver_of_subrogation"
          label="Waiver of subrogation"
          defaultChecked={Boolean(cert.waiver_of_subrogation)}
        />
      </div>

      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      {state?.ok && (
        <p className="text-sm text-green-700">Saved.</p>
      )}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
}: {
  name: string;
  label: string;
  defaultValue: string | null | undefined;
  type?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
      />
    </div>
  );
}

function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-input"
      />
      {label}
    </label>
  );
}
