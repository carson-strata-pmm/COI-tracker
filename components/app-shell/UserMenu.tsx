"use client";

import Link from "next/link";
import { LogOut, LogIn, User } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shows the signed-in user with a sign-out action, or a sign-in link
 * in dev/demo mode (no session).
 */
export function UserMenu({ email }: { email: string | null }) {
  if (!email) {
    return (
      <Button variant="ghost" size="sm" asChild>
        <Link href="/auth/login">
          <LogIn className="h-4 w-4" /> Sign in
        </Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex">
        <User className="h-3.5 w-3.5" />
        {email}
      </span>
      <form action="/auth/sign-out" method="post">
        <Button variant="ghost" size="icon" type="submit" title="Sign out">
          <LogOut className="h-4 w-4" />
          <span className="sr-only">Sign out</span>
        </Button>
      </form>
    </div>
  );
}
