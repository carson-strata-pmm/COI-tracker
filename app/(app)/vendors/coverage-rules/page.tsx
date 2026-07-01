import { CoverageRequirements } from "@/components/settings/CoverageRequirements";
import { getResolvedRequirements } from "@/lib/queries";
import { requireActiveOrg } from "@/lib/guards";

export const dynamic = "force-dynamic";

export default async function CoverageRulesPage() {
  await requireActiveOrg();
  const requirements = await getResolvedRequirements();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Coverage Rules
        </h1>
        <p className="text-sm text-muted-foreground">
          Minimum insurance requirements by vendor type, checked during AI
          review. Defaults are market-standard; override any row to match your
          contracts.
        </p>
      </div>

      <CoverageRequirements requirements={requirements} />
    </div>
  );
}
