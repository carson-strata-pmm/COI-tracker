"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { AIReviewBadge } from "@/components/dashboard/AIReviewBadge";
import { RequestCoiButton } from "@/components/vendors/RequestCoiButton";
import { NotifyVendorButton } from "@/components/vendors/NotifyVendorButton";
import { STATUS_LABELS, STATUS_ORDER } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { getFailedChecks } from "@/lib/ai-review-format";
import type { VendorStatus } from "@/lib/constants";
import type { VendorWithCert } from "@/lib/types";

type SortKey = "company_name" | "status" | "expiration_date";

export function VendorTable({
  vendors,
  showAiColumn,
}: {
  vendors: VendorWithCert[];
  showAiColumn: boolean;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<VendorStatus | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortAsc, setSortAsc] = useState(true);

  const rows = useMemo(() => {
    let r = vendors.filter((v) => {
      const matchesQuery =
        !query ||
        v.company_name.toLowerCase().includes(query.toLowerCase()) ||
        (v.contact_name ?? "").toLowerCase().includes(query.toLowerCase()) ||
        (v.vendor_type ?? "").toLowerCase().includes(query.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || v.status === statusFilter;
      return matchesQuery && matchesStatus;
    });

    r = [...r].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "company_name") {
        cmp = a.company_name.localeCompare(b.company_name);
      } else if (sortKey === "status") {
        cmp =
          STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      } else {
        const ax = a.latest_certificate?.expiration_date ?? "";
        const bx = b.latest_certificate?.expiration_date ?? "";
        cmp = ax.localeCompare(bx);
      }
      return sortAsc ? cmp : -cmp;
    });
    return r;
  }, [vendors, query, statusFilter, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((s) => !s);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search contractors…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as VendorStatus | "all")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button
                  className="flex items-center gap-1"
                  onClick={() => toggleSort("company_name")}
                >
                  Contractor <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center gap-1"
                  onClick={() => toggleSort("status")}
                >
                  Status <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  className="flex items-center gap-1"
                  onClick={() => toggleSort("expiration_date")}
                >
                  Expires <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              {showAiColumn && <TableHead>AI review</TableHead>}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={showAiColumn ? 5 : 4}
                  className="py-8 text-center text-muted-foreground"
                >
                  No contractors match your filters.
                </TableCell>
              </TableRow>
            )}
            {rows.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <Link
                    href={`/vendors/${v.id}`}
                    className="font-medium hover:underline"
                  >
                    {v.company_name}
                  </Link>
                  {v.vendor_type && (
                    <div className="text-xs text-muted-foreground">
                      {v.vendor_type}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <StatusBadge status={v.status} />
                </TableCell>
                <TableCell>
                  {formatDate(v.latest_certificate?.expiration_date)}
                </TableCell>
                {showAiColumn && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AIReviewBadge
                        review={v.latest_ai_review}
                        hasCert={Boolean(v.latest_certificate)}
                      />
                      {v.latest_ai_review?.status === "complete" &&
                        v.latest_ai_review.issues_found > 0 &&
                        v.latest_certificate && (
                          <NotifyVendorButton
                            vendorId={v.id}
                            vendorName={v.contact_name ?? v.company_name}
                            certId={v.latest_certificate.id}
                            aiReviewId={v.latest_ai_review.id}
                            issues={getFailedChecks(v.latest_ai_review.report)}
                            variant="link"
                            label="Notify vendor"
                          />
                        )}
                    </div>
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <div className="flex justify-end">
                    <RequestCoiButton vendorId={v.id} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
