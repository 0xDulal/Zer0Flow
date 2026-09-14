import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { createLead } from "@/lib/leads/actions";

import { LeadForm } from "../lead-form";

export const metadata: Metadata = {
  title: "New lead · Zer0Flow",
};

export default function NewLeadPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <div className="mb-6 space-y-2">
        <Link
          href="/dashboard/leads"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to leads
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Add lead</h1>
        <p className="text-sm text-muted-foreground">
          Create a new lead in your workspace.
        </p>
      </div>

      <Card>
        <CardContent>
          <LeadForm
            action={createLead}
            submitLabel="Create lead"
            cancelHref="/dashboard/leads"
          />
        </CardContent>
      </Card>
    </div>
  );
}
