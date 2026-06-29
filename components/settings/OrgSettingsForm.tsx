"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateOrg, type ActionResult } from "@/app/(app)/settings/actions";
import { INDUSTRY_TYPES } from "@/lib/constants";
import type { Organization } from "@/lib/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

export function OrgSettingsForm({ org }: { org: Organization }) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    updateOrg,
    null
  );

  return (
    <form action={formAction} className="grid max-w-md gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Organization name</Label>
        <Input id="name" name="name" defaultValue={org.name} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="industry_type">Industry</Label>
        <Select name="industry_type" defaultValue={org.industry_type ?? ""}>
          <SelectTrigger>
            <SelectValue placeholder="Select an industry" />
          </SelectTrigger>
          <SelectContent>
            {INDUSTRY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {state && (
        <p
          className={
            state.ok ? "text-sm text-green-700" : "text-sm text-destructive"
          }
        >
          {state.ok ? "Saved." : state.error}
        </p>
      )}
      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
