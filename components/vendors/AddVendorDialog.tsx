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
import { isAtVendorLimit, upgradePromptCopy } from "@/lib/upgrade-copy";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/constants";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding…" : "Add contractor"}
    </Button>
  );
}

function UpgradePrompt({ plan, onClose }: { plan: Plan; onClose: () => void }) {
  const { headline, subcopy, plans } = upgradePromptCopy(plan);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function checkout(planId: string) {
    setCheckingOut(planId);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout unavailable");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Checkout unavailable");
      setCheckingOut(null);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
        <p className="font-semibold text-green-800">{headline}</p>
        <p className="mt-1 text-green-700">{subcopy}</p>
      </div>

      <div
        className={cn(
          "grid gap-2",
          plans.length === 1 ? "justify-items-center" : "sm:grid-cols-2"
        )}
      >
        {plans.map((p) => (
          <div
            key={p.id}
            className={cn(
              "flex flex-col rounded-lg border p-3",
              plans.length === 1 && "w-full max-w-xs"
            )}
          >
            <div className="flex items-baseline justify-between gap-1">
              <span className="font-semibold">{p.name}</span>
              <span className="text-sm font-medium">
                ${p.priceYearly}
                <span className="text-muted-foreground">/yr</span>
              </span>
            </div>
            <p className="mt-1 flex-1 text-xs text-muted-foreground">
              {p.vendorLimit === null
                ? "Unlimited contractors"
                : `Up to ${p.vendorLimit} contractors`}
            </p>
            <Button
              size="sm"
              className="mt-2"
              onClick={() => checkout(p.id)}
              disabled={checkingOut !== null}
            >
              {checkingOut === p.id ? (
                "Redirecting…"
              ) : (
                <>
                  Choose {p.name} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        ))}
      </div>

      {checkoutError && (
        <p className="text-sm text-destructive">{checkoutError}</p>
      )}

      <DialogFooter className="sm:justify-end">
        <Button variant="outline" onClick={onClose} disabled={checkingOut !== null}>
          Maybe later
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

  const sentVia = [state.emailed && "email", state.texted && "text"].filter(
    Boolean
  );

  return (
    <div className="grid gap-4">
      <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
        <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
        <div className="text-sm">
          <p className="font-medium text-green-800">Contractor added</p>
          {sentVia.length > 0 ? (
            <p className="mt-0.5 text-green-700">
              Upload request sent via {sentVia.join(" and ")}.
            </p>
          ) : (
            <p className="mt-0.5 text-green-700">
              Share the upload link below with your contractor.
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
  vendorTypes,
  plan,
  vendorCount,
}: {
  triggerVariant?: "default" | "outline";
  vendorTypes: string[];
  plan: Plan;
  vendorCount: number;
}) {
  const [open, setOpen] = useState(false);
  // Decided the moment the dialog opens (or when a race-condition save
  // hits the limit — see the effect below), not on submit: never open
  // the form if the user can't save the result.
  const [mode, setMode] = useState<"form" | "upgrade">("form");
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    createVendor,
    null
  );

  function handleOpenChange(next: boolean) {
    if (next) {
      setMode(isAtVendorLimit(plan, vendorCount) ? "upgrade" : "form");
    }
    setOpen(next);
  }

  useEffect(() => {
    if (state && !state.ok && state.atLimit) {
      setMode("upgrade");
    }
  }, [state]);

  const success = state?.ok && state.uploadUrl;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant}>
          <Plus className="h-4 w-4" /> Add contractor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "upgrade" && !success
              ? upgradePromptCopy(plan).headline
              : "Add a contractor"}
          </DialogTitle>
          {mode === "form" && !success && (
            <DialogDescription>
              Add a contractor or subcontractor to track their certificate of
              insurance. We&apos;ll automatically send them an upload link.
            </DialogDescription>
          )}
        </DialogHeader>

        {success ? (
          <SuccessStep
            state={state as Extract<ActionResult, { ok: true }> & { uploadUrl: string }}
            onClose={() => setOpen(false)}
          />
        ) : mode === "upgrade" ? (
          <UpgradePrompt plan={plan} onClose={() => setOpen(false)} />
        ) : (
          <form action={formAction} className="grid gap-4">
            <VendorFormFields vendorTypes={vendorTypes} />
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
