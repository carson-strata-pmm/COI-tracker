import { planConfig } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { MobileNav } from "@/components/app-shell/MobileNav";
import { UserMenu } from "@/components/app-shell/UserMenu";
import type { Organization } from "@/lib/types";

export function Topbar({
  org,
  userEmail,
}: {
  org: Organization;
  userEmail: string | null;
}) {
  const plan = planConfig(org.plan);
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 sm:px-6">
      <div className="flex items-center gap-2">
        <MobileNav />
        <span className="text-sm font-medium">{org.name}</span>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant={org.plan === "pro_plus" ? "default" : "secondary"}>
          {plan.name} plan
        </Badge>
        <UserMenu email={userEmail} />
      </div>
    </header>
  );
}
