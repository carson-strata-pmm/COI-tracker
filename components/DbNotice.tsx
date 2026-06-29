import { Info } from "lucide-react";

/**
 * Shown in dev when Supabase isn't connected. The app renders from
 * in-memory fixtures and writes are disabled until credentials are
 * set.
 */
export function DbNotice() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <Info className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">Demo data — database not connected</p>
        <p className="text-amber-800">
          You&apos;re viewing seeded sample vendors. Set{" "}
          <code className="rounded bg-amber-100 px-1">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          and{" "}
          <code className="rounded bg-amber-100 px-1">
            SUPABASE_SERVICE_ROLE_KEY
          </code>{" "}
          (and run the migrations + seed) to enable adding, editing, and
          uploading.
        </p>
      </div>
    </div>
  );
}
