"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 rounded-full bg-muted p-3">
        <AlertTriangle className="h-6 w-6 text-amber-600" />
      </div>
      <h2 className="text-lg font-medium">Something went wrong</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        We couldn&apos;t load this page. This can happen if the database is
        unreachable or misconfigured. Check your Supabase connection and try
        again.
      </p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  );
}
