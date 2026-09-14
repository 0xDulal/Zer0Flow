import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Dashboard · Zer0Flow",
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-6">
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/dashboard"
              className="mr-3 font-semibold tracking-tight"
            >
              Zer0Flow
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md px-2.5 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Dashboard
            </Link>
            <Link
              href="/dashboard/leads"
              className="rounded-md px-2.5 py-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Leads
            </Link>
          </nav>

          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
