import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { updateLead } from "@/lib/leads/actions";
import {
  toDateTimeLocalValue,
  type LeadFormDefaults,
} from "@/lib/leads/format";
import { getLeadById } from "@/lib/leads/queries";
import { createClient } from "@/lib/supabase/server";

import { LeadForm } from "../../lead-form";

export const metadata: Metadata = {
  title: "Edit lead · Zer0Flow",
};

type EditLeadPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditLeadPage({ params }: EditLeadPageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { lead, error } = await getLeadById(supabase, id);

  if (error) {
    return (
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Could not load this lead: {error}
        </div>
      </div>
    );
  }

  if (!lead) {
    notFound();
  }

  const defaults: LeadFormDefaults = {
    full_name: lead.full_name,
    company_name: lead.company_name ?? "",
    website: lead.website ?? "",
    linkedin_url: lead.linkedin_url ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    niche: lead.niche ?? "",
    location: lead.location ?? "",
    source: lead.source,
    stage: lead.stage,
    status: lead.status,
    temperature: lead.temperature,
    deal_value: String(lead.deal_value),
    probability: String(lead.probability),
    expected_close_date: lead.expected_close_date ?? "",
    next_action: lead.next_action ?? "",
    next_action_at: lead.next_action_at
      ? toDateTimeLocalValue(lead.next_action_at)
      : "",
    notes: lead.notes ?? "",
  };

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <div className="mb-6 space-y-2">
        <Link
          href={`/dashboard/leads/${lead.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to lead
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Edit lead</h1>
        <p className="text-sm text-muted-foreground">{lead.full_name}</p>
      </div>

      <Card>
        <CardContent>
          <LeadForm
            action={updateLead}
            submitLabel="Save changes"
            cancelHref={`/dashboard/leads/${lead.id}`}
            leadId={lead.id}
            defaultValues={defaults}
          />
        </CardContent>
      </Card>
    </div>
  );
}
