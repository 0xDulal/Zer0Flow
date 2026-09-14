import Link from "next/link";
import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DashboardAction } from "@/lib/dashboard/queries";
import { formatRelativeDue } from "@/lib/leads/due";
import { formatCurrency, labelize } from "@/lib/leads/format";
import type { LeadTemperature } from "@/lib/leads/format";

type BadgeVariant = NonNullable<ComponentProps<typeof Badge>["variant"]>;

function temperatureVariant(temperature: LeadTemperature): BadgeVariant {
  if (temperature === "HOT") {
    return "default";
  }

  if (temperature === "WARM") {
    return "secondary";
  }

  return "outline";
}

export function TodaysActions({ actions }: { actions: DashboardAction[] }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Today&apos;s actions
        </h2>
        <p className="text-sm text-muted-foreground">
          Focus on the opportunities most likely to move revenue forward.
        </p>
      </div>

      {actions.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card px-6 py-10 text-center">
          <p className="text-sm font-medium">You&apos;re clear for now.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Add a lead or schedule a follow-up and Zer0Flow will surface what
            needs attention here.
          </p>
          <div className="mt-4 flex justify-center">
            <Button asChild size="sm">
              <Link href="/dashboard/leads/new">Add lead</Link>
            </Button>
          </div>
        </div>
      ) : (
        <Card className="py-0">
          <ul className="divide-y">
            {actions.map((action) => (
              <li key={action.lead.id}>
                <Link
                  href={`/dashboard/leads/${action.lead.id}`}
                  className="group flex items-start justify-between gap-4 px-4 py-4 transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none sm:px-6"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {action.lead.full_name}
                      </span>
                      {action.dueState === "overdue" ? (
                        <Badge variant="destructive">Overdue</Badge>
                      ) : null}
                    </div>

                    {action.lead.company_name ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {action.lead.company_name}
                      </p>
                    ) : null}

                    <p className="truncate text-sm text-foreground/90">
                      {action.lead.next_action}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className="font-medium tabular-nums text-foreground">
                        {formatCurrency(action.lead.deal_value ?? 0)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <Badge
                        variant={temperatureVariant(action.lead.temperature)}
                      >
                        {labelize(action.lead.temperature)}
                      </Badge>
                      <span aria-hidden="true">·</span>
                      <span>{formatRelativeDue(action.dueAt)}</span>
                    </div>
                  </div>

                  <span className="hidden shrink-0 text-xs font-medium text-muted-foreground group-hover:text-foreground sm:inline">
                    Open lead →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
