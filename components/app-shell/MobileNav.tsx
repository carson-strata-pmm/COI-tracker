"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  LayoutDashboard,
  Users,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const vendorsActive = pathname.startsWith("/vendors");
  const onCoverageRules = pathname.startsWith("/vendors/coverage-rules");

  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="left-0 top-0 h-full max-w-[16rem] translate-x-0 translate-y-0 rounded-none border-r p-0 sm:rounded-none">
        <DialogTitle className="flex h-14 items-center gap-2 border-b px-5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          CertTrack
        </DialogTitle>
        <nav className="space-y-1 p-3">
          <Link
            href="/dashboard"
            onClick={close}
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
            onClick={close}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              vendorsActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Users className="h-4 w-4" />
            Contractors
          </Link>

          {vendorsActive && (
            <div className="ml-7 space-y-0.5 border-l pl-3">
              <Link
                href="/vendors"
                onClick={close}
                className={cn(
                  "block rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  !onCoverageRules
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                All Contractors
              </Link>
              <Link
                href="/vendors/coverage-rules"
                onClick={close}
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
            onClick={close}
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
      </DialogContent>
    </Dialog>
  );
}
