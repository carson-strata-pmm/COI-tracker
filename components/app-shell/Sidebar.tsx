"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Settings, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const vendorsActive = pathname.startsWith("/vendors");
  const onCoverageRules = pathname.startsWith("/vendors/coverage-rules");

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-5">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <span className="font-semibold tracking-tight">CertTrack</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/dashboard"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>

        <Link
          href="/vendors"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            vendorsActive
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Users className="h-4 w-4" />
          Vendors
        </Link>

        {vendorsActive && (
          <div className="ml-7 space-y-0.5 border-l pl-3">
            <Link
              href="/vendors"
              className={cn(
                "block rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                !onCoverageRules
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              All Vendors
            </Link>
            <Link
              href="/vendors/coverage-rules"
              className={cn(
                "block rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                onCoverageRules
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              Coverage Rules
            </Link>
          </div>
        )}

        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </nav>
    </aside>
  );
}
