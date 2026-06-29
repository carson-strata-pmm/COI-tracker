import { planConfig } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import type { Organization } from "@/lib/types";

export function Topbar({ org }: { org: Organization }) {
  const plan = planConfig(org.plan);
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{org.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={org.plan === "pro_plus" ? "default" : "secondary"}>
          {plan.name} plan
        </Badge>
      </div>
    </header>
  );
}
