import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function LeadNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
      <h1 className="text-xl font-semibold tracking-tight">Lead not found</h1>
      <p className="text-sm text-muted-foreground">
        This lead doesn&apos;t exist or isn&apos;t part of your workspace.
      </p>
      <Button asChild variant="outline" size="sm" className="mt-2">
        <Link href="/dashboard/leads">Back to leads</Link>
      </Button>
    </div>
  );
}
