"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Pencil } from "lucide-react";
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
import { VendorFormFields } from "@/components/vendors/VendorFormFields";
import { updateVendor, type ActionResult } from "@/app/(app)/vendors/actions";
import type { Vendor } from "@/lib/types";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save changes"}
    </Button>
  );
}

export function EditVendorDialog({
  vendor,
  vendorTypes,
}: {
  vendor: Vendor;
  vendorTypes: string[];
}) {
  const [open, setOpen] = useState(false);
  const action = updateVendor.bind(null, vendor.id);
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    action,
    null
  );

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit vendor</DialogTitle>
          <DialogDescription>
            Update contact details for {vendor.company_name}.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <VendorFormFields vendor={vendor} vendorTypes={vendorTypes} />
          {state && !state.ok && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
