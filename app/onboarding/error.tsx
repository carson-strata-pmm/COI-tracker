"use client";

import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OnboardingError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[onboarding error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <span className="text-lg font-semibold tracking-tight">CertTrack</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load the setup page. Please try refreshing, or
            sign in again from the login page.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground">Error: {error.digest}</p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={reset} variant="default">
            Try again
          </Button>
          <Button variant="outline" asChild>
            <a href="/auth/login">Back to login</a>
          </Button>
        </div>
      </div>
    </div>
  );
}
