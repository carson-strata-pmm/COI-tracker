"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BillingPeriod, Plan } from "@/lib/constants";

type Mode = "login" | "signup";

export function AuthForm({
  mode,
  plan,
  billing,
}: {
  mode: Mode;
  /** Only meaningful for mode="signup" — carries an intended paid plan through email confirmation. */
  plan?: Plan;
  billing?: BillingPeriod;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  // Carries the intended plan across the email-confirmation redirect
  // when it happens in the same tab; the onboarding/checkout redirect
  // is also driven by plan/billing baked into the confirmation link's
  // `next` query param, so cross-tab and cross-device confirmation
  // still lands on checkout correctly even when sessionStorage doesn't
  // survive.
  function rememberIntendedPlan() {
    if (mode === "signup" && plan && billing && typeof window !== "undefined") {
      sessionStorage.setItem("intended_plan", plan);
      sessionStorage.setItem("intended_billing", billing);
    }
  }

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  async function onPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        rememberIntendedPlan();
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, plan, billing }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Something went wrong");
        setNotice(
          "Check your email to confirm your account, then sign in to finish setup."
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(next);
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function onMagicLink() {
    setError(null);
    setNotice(null);
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    setLoading(true);
    try {
      rememberIntendedPlan();
      const magicLinkNext =
        mode === "signup" && plan && billing
          ? `/onboarding?plan=${plan}&billing=${billing}`
          : next;
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${appUrl}/auth/callback?next=${encodeURIComponent(magicLinkNext)}`,
        },
      });
      if (error) throw error;
      setNotice("Check your email for a magic sign-in link.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onPassword} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@business.com"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && <p className="text-sm text-green-700">{notice}</p>}

      <Button type="submit" disabled={loading}>
        {loading
          ? "Working…"
          : mode === "signup"
            ? "Create account"
            : "Sign in"}
      </Button>

      <div className="relative py-1 text-center text-xs text-muted-foreground">
        <span className="bg-card px-2">or</span>
        <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={onMagicLink}
        disabled={loading}
      >
        Email me a magic link
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/auth/login" className="underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to CertTrack?{" "}
            <Link href="/auth/signup" className="underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
