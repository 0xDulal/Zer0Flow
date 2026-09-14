import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatScore,
  labelize,
  toExternalUrl,
} from "@/lib/leads/format";
import { getLeadActivities, getLeadById } from "@/lib/leads/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Lead · Zer0Flow",
};

type LeadDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LeadDetailPage({
  params,
  searchParams,
}: LeadDetailPageProps) {
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

  const { activities, error: activityError } = await getLeadActivities(
    supabase,
    lead.id,
  );

  const query = await searchParams;
  const activityFailed = query.activity === "failed";

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-6 py-8">
      <Link
        href="/dashboard/leads"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to leads
      </Link>

      {activityFailed ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          The lead was created, but its activity record could not be written.
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {lead.full_name}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{labelize(lead.stage)}</Badge>
            <Badge variant="outline">{labelize(lead.status)}</Badge>
            <Badge variant="muted">{labelize(lead.temperature)}</Badge>
          </div>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link href={`/dashboard/leads/${lead.id}/edit`}>Edit lead</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <DetailItem label="Company">{lead.company_name ?? "—"}</DetailItem>
            <DetailItem label="Niche">{lead.niche ?? "—"}</DetailItem>
            <DetailItem label="Email">
              {lead.email ? (
                <a
                  href={`mailto:${lead.email}`}
                  className="hover:underline"
                >
                  {lead.email}
                </a>
              ) : (
                "—"
              )}
            </DetailItem>
            <DetailItem label="Phone">{lead.phone ?? "—"}</DetailItem>
            <DetailItem label="Website">
              {lead.website ? (
                <a
                  href={toExternalUrl(lead.website)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {lead.website}
                </a>
              ) : (
                "—"
              )}
            </DetailItem>
            <DetailItem label="LinkedIn">
              {lead.linkedin_url ? (
                <a
                  href={toExternalUrl(lead.linkedin_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {lead.linkedin_url}
                </a>
              ) : (
                "—"
              )}
            </DetailItem>
            <DetailItem label="Location">{lead.location ?? "—"}</DetailItem>
            <DetailItem label="Source">{labelize(lead.source)}</DetailItem>
            <DetailItem label="ICP score">
              {formatScore(lead.icp_score)}
            </DetailItem>
            <DetailItem label="Website score">
              {formatScore(lead.website_score)}
            </DetailItem>
            <DetailItem label="Opportunity score">
              {formatScore(lead.opportunity_score)}
            </DetailItem>
            <DetailItem label="Probability">{lead.probability}%</DetailItem>
            <DetailItem label="Deal value">
              {formatCurrency(lead.deal_value)}
            </DetailItem>
            <DetailItem label="Expected close date">
              {formatDate(lead.expected_close_date)}
            </DetailItem>
            <DetailItem label="Next action">
              {lead.next_action ?? "—"}
            </DetailItem>
            <DetailItem label="Next action date">
              {formatDateTime(lead.next_action_at)}
            </DetailItem>
            <div className="space-y-1 sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Notes
              </dt>
              <dd className="whitespace-pre-wrap text-sm">
                {lead.notes ?? "—"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activityError ? (
            <p className="text-sm text-destructive">
              Could not load activity: {activityError}
            </p>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <ol className="space-y-4">
              {activities.map((activity) => (
                <li key={activity.id} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-border" />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {activity.title}
                      </span>
                      <Badge variant="muted">
                        {labelize(activity.type)}
                      </Badge>
                    </div>
                    {activity.description ? (
                      <p className="text-sm text-muted-foreground">
                        {activity.description}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(activity.occurred_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
