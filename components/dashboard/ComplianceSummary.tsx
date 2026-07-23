import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  CircleDashed,
  Hourglass,
} from "lucide-react";
import type { VendorStatus } from "@/lib/constants";
import type { VendorWithCert } from "@/lib/types";
import { cn } from "@/lib/utils";

const CARDS: {
  status: VendorStatus;
  label: string;
  icon: typeof CheckCircle2;
  className: string;
}[] = [
  {
    status: "action_needed",
    label: "Action needed",
    icon: AlertCircle,
    className: "text-red-600",
  },
  {
    status: "expired",
    label: "Expired",
    icon: AlertTriangle,
    className: "text-red-600",
  },
  {
    status: "pending_review",
    label: "Pending review",
    icon: Hourglass,
    className: "text-slate-500",
  },
  {
    status: "expiring_soon",
    label: "Expiring soon",
    icon: Clock,
    className: "text-amber-600",
  },
  {
    status: "missing",
    label: "Missing",
    icon: CircleDashed,
    className: "text-slate-500",
  },
  {
    status: "compliant",
    label: "Compliant",
    icon: CheckCircle2,
    className: "text-green-600",
  },
];

export function ComplianceSummary({
  vendors,
}: {
  vendors: VendorWithCert[];
}) {
  const counts = vendors.reduce<Record<VendorStatus, number>>(
    (acc, v) => {
      acc[v.status] = (acc[v.status] ?? 0) + 1;
      return acc;
    },
    {
      compliant: 0,
      expiring_soon: 0,
      expired: 0,
      missing: 0,
      pending_review: 0,
      action_needed: 0,
    }
  );

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {CARDS.map(({ status, label, icon: Icon, className }) => (
        <Card key={status}>
          <CardContent className="flex items-center gap-4 p-5">
            <Icon className={cn("h-8 w-8", className)} />
            <div>
              <div className="text-2xl font-semibold">{counts[status]}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
