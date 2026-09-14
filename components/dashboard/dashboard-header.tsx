import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

function greetingFor(date: Date): string {
  const hour = date.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

export function DashboardHeader({ name }: { name: string }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {greetingFor(new Date())}, {name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what needs your attention today.
        </p>
      </div>

      <Button asChild>
        <Link href="/dashboard/leads/new">
          <Plus aria-hidden="true" />
          Add lead
        </Link>
      </Button>
    </header>
  );
}
