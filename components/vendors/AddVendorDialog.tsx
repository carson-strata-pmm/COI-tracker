"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
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
import { createVendor, type ActionResult } from "@/app/(app)/vendors/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding…" : "Add vendor"}
    </Button>
  );
}

export function AddVendorDialog({
  triggerVariant = "default",
}: {
  triggerVariant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    createVendor,
    null
  );

  useEffect(() => {
    if (state?.ok) setOpen(false);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant}>
          <Plus className="h-4 w-4" /> Add vendor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a vendor</DialogTitle>
          <DialogDescription>
            Add a vendor or subcontractor to track their certificate of
            insurance.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-4">
          <VendorFormFields />
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
