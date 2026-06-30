"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ArrowRight, Check, Copy, Plus } from "lucide-react";
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
import type { PlanConfig } from "@/lib/constants";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding…" : "Add vendor"}
    </Button>
  );
}

function UpgradePrompt({
  currentError,
  upgradePlan,
  onClose,
}: {
  currentError: string;
  upgradePlan: PlanConfig;
  onClose: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function upgrade() {
    setPending(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: upgradePlan.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout unavailable");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Checkout unavailable");
      setPending(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
        <p className="font-medium text-amber-900">{currentError}</p>
        <p className="mt-1 text-amber-800">
          Upgrade to <strong>{upgradePlan.name}</strong> (${upgradePlan.priceYearly}/yr) to track{" "}
          {upgradePlan.vendorLimit === null
            ? "unlimited vendors"
            : `up to ${upgradePlan.vendorLimit} vendors`}
          .
        </p>
      </div>
      {checkoutError && (
        <p className="text-sm text-destructive">{checkoutError}</p>
      )}
      <DialogFooter className="gap-2">
        <Button variant="outline" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button onClick={upgrade} disabled={pending}>
          {pending ? "Redirecting…" : (
            <>Upgrade to {upgradePlan.name} <ArrowRight className="ml-1.5 h-4 w-4" /></>
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

function SuccessStep({
  state,
  onClose,
}: {
  state: Extract<ActionResult, { ok: true }> & { uploadUrl: string };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(state.uploadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const sentVia = [
    state.emailed && "email",
    state.texted && "text",
  ].filter(Boolean);

  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
        <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
        <div className="text-sm">
          <p className="font-medium text-green-800">Vendor added</p>
          {sentVia.length > 0 ? (
            <p className="mt-0.5 text-green-700">
              Upload request sent via {sentVia.join(" and ")}.
            </p>
          ) : (
            <p className="mt-0.5 text-green-700">
              Share the upload link below with your vendor.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-1.5">
        <p className="text-xs font-medium text-muted-foreground">Upload link</p>
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-xs font-mono">
            {state.uploadUrl}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={copy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={onClose}>Done</Button>
      </DialogFooter>
    </div>
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

  function handleOpenChange(next: boolean) {
    setOpen(next);
  }

  useEffect(() => {
    if (!open) {
      // Reset handled by re-mounting the form via key; nothing needed here.
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            insurance. We&apos;ll automatically send them an upload link.
          </DialogDescription>
        </DialogHeader>

        {state?.ok && state.uploadUrl ? (
          <SuccessStep
            state={state as Extract<ActionResult, { ok: true }> & { uploadUrl: string }}
            onClose={() => setOpen(false)}
          />
        ) : state && !state.ok && state.upgradePlan ? (
          <UpgradePrompt
            currentError={state.error}
            upgradePlan={state.upgradePlan}
            onClose={() => setOpen(false)}
          />
        ) : (
          <form action={formAction} className="grid gap-4">
            <VendorFormFields />
            {state && !state.ok && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
            <DialogFooter>
              <SubmitButton />
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
