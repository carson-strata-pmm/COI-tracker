import { FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { formatDate } from "@/lib/format";
import { daysUntil } from "@/lib/status";
import type { Certificate } from "@/lib/types";

export function COIHistory({ certs }: { certs: Certificate[] }) {
  if (certs.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No certificates on file"
        description="Upload a COI directly, or send the contractor an upload request."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Insurer</TableHead>
          <TableHead>Policy #</TableHead>
          <TableHead>Effective</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Source</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {certs.map((c) => {
          const days = c.expiration_date ? daysUntil(c.expiration_date) : null;
          return (
            <TableRow key={c.id}>
              <TableCell className="font-medium">
                {c.insurer_name ?? "—"}
              </TableCell>
              <TableCell>{c.policy_number ?? "—"}</TableCell>
              <TableCell>{formatDate(c.effective_date)}</TableCell>
              <TableCell>
                {formatDate(c.expiration_date)}
                {days !== null && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {days < 0 ? `${Math.abs(days)}d ago` : `in ${days}d`}
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="capitalize">
                  {c.parse_source ?? "manual"}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
