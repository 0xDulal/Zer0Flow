import Link from "next/link";

import { Button } from "@/components/ui/button";

export function EmptyDashboard() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Your sales command center is ready.
      </h1>
      <p className="text-sm text-muted-foreground">
        Add your first lead and Zer0Flow will turn your pipeline into a clear
        daily action list.
      </p>
      <Button asChild size="lg" className="mt-2">
        <Link href="/dashboard/leads/new">Add your first lead</Link>
      </Button>
      <p className="text-sm text-muted-foreground">
        Start with your warmest opportunity.
      </p>
    </div>
  );
}
