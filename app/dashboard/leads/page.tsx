import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCurrency,
  formatDateTime,
  formatScore,
  isLeadStatusFilter,
  labelize,
  leadStatusFilters,
  type LeadStatusFilter,
} from "@/lib/leads/format";
import { listLeads } from "@/lib/leads/queries";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Leads · Zer0Flow",
};

type LeadsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function buildLeadsHref(status: LeadStatusFilter, query: string): string {
  const params = new URLSearchParams();

  if (status !== "ALL") {
    params.set("status", status);
  }

  if (query) {
    params.set("q", query);
  }

  const search = params.toString();

  return search ? `/dashboard/leads?${search}` : "/dashboard/leads";
}

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const query = firstValue(params.q).trim();
  const rawStatus = firstValue(params.status).toUpperCase();
  const status: LeadStatusFilter = isLeadStatusFilter(rawStatus)
    ? rawStatus
    : "ALL";

  const { leads, count, error } = await listLeads(supabase, { status, query });

  const hasFilters = status !== "ALL" || query.length > 0;

  return (
    <div className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Your prospects and where each one stands.
          </p>
        </div>

        <Button asChild>
          <Link href="/dashboard/leads/new">Add lead</Link>
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          {leadStatusFilters.map((filter) => {
            const active = filter === status;

            return (
              <Link
                key={filter}
                href={buildLeadsHref(filter, query)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-secondary font-medium text-secondary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {filter === "ALL" ? "All" : labelize(filter)}
              </Link>
            );
          })}
        </div>

        <form
          action="/dashboard/leads"
          method="get"
          className="flex w-full items-center gap-2 sm:w-72"
        >
          {status !== "ALL" ? (
            <input type="hidden" name="status" value={status} />
          ) : null}
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search name, company, email"
            aria-label="Search leads"
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        {count} {count === 1 ? "lead" : "leads"}
      </p>

      <div className="mt-3">
        {error ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Could not load leads: {error}
          </div>
        ) : leads.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Company</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Temperature
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Opportunity
                  </TableHead>
                  <TableHead>Deal value</TableHead>
                  <TableHead className="hidden xl:table-cell">
                    Next action
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    Next action date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="hover:underline"
                      >
                        {lead.full_name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {lead.company_name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{labelize(lead.stage)}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline">
                        {labelize(lead.temperature)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {formatScore(lead.opportunity_score)}
                    </TableCell>
                    <TableCell>{formatCurrency(lead.deal_value)}</TableCell>
                    <TableCell className="hidden max-w-[220px] truncate text-muted-foreground xl:table-cell">
                      {lead.next_action ?? "—"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">
                      {formatDateTime(lead.next_action_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-lg border border-dashed px-6 py-16 text-center">
      <p className="text-sm font-medium">
        {hasFilters ? "No leads match your filters" : "No leads yet"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasFilters
          ? "Try a different search or clear the filters."
          : "Add your first lead to start tracking prospects."}
      </p>
      <div className="mt-4 flex justify-center">
        {hasFilters ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/leads">Clear filters</Link>
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link href="/dashboard/leads/new">Add your first lead</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
