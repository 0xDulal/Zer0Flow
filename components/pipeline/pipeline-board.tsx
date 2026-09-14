import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatCurrency, labelize } from "@/lib/leads/format";
import type { PipelineColumn, PipelineData } from "@/lib/pipeline/queries";

import { PipelineCard } from "./pipeline-card";

function ColumnHeader({ column }: { column: PipelineColumn }) {
  const countLabel = column.count === 1 ? "1 lead" : `${column.count} leads`;

  return (
    <header className="space-y-0.5 border-b px-3.5 py-3">
      <h3 className="text-sm font-semibold tracking-tight">
        {labelize(column.stage)}
      </h3>
      <p className="text-xs text-muted-foreground tabular-nums">
        {countLabel} · {formatCurrency(column.value)}
      </p>
    </header>
  );
}

function NoLeads({ className }: { className?: string }) {
  return (
    <p
      className={`rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground ${className ?? ""}`}
    >
      No leads
    </p>
  );
}

export function PipelineBoard({ data }: { data: PipelineData }) {
  if (!data.hasLeads) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
        <h2 className="text-xl font-semibold tracking-tight">
          Your pipeline is empty.
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Add your first lead and start moving opportunities through your sales
          process.
        </p>
        <Button asChild>
          <Link href="/dashboard/leads/new">Add your first lead</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section aria-label="Active pipeline">
        <div className="w-full overflow-x-auto pb-2">
          <div className="flex min-w-max gap-4">
            {data.columns.map((column) => (
              <div
                key={column.stage}
                className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/40"
              >
                <ColumnHeader column={column} />
                <div className="flex flex-1 flex-col gap-2.5 p-2.5">
                  {column.leads.length === 0 ? (
                    <NoLeads />
                  ) : (
                    column.leads.map((lead) => (
                      <PipelineCard key={lead.id} lead={lead} />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-label="Closed and nurture" className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">
            Closed &amp; nurture
          </h2>
          <p className="text-sm text-muted-foreground">
            Deals that are done or parked for later.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {data.terminal.map((column) => (
            <div key={column.stage} className="rounded-xl border">
              <ColumnHeader column={column} />
              <div className="space-y-2.5 p-2.5">
                {column.leads.length === 0 ? (
                  <NoLeads className="border-0 py-2 text-left" />
                ) : (
                  column.leads.map((lead) => (
                    <PipelineCard key={lead.id} lead={lead} compact />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
