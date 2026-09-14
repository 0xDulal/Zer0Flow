import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { DashboardLead } from "@/lib/dashboard/queries";
import { formatCurrency, labelize } from "@/lib/leads/format";

export function HotOpportunities({ leads }: { leads: DashboardLead[] }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">
          Hot opportunities
        </h2>
        <p className="text-sm text-muted-foreground">
          Leads worth paying attention to.
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
          No active opportunities yet.
        </div>
      ) : (
        <Card className="py-0">
          <ul className="divide-y">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="group block px-6 py-4 transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="truncate text-sm font-medium">
                        {lead.full_name}
                      </p>
                      {lead.company_name ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {lead.company_name}
                        </p>
                      ) : null}
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {labelize(lead.stage)}
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium tabular-nums text-foreground">
                      {formatCurrency(lead.deal_value ?? 0)}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{lead.probability ?? 0}%</span>
                    {lead.next_action ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{lead.next_action}</span>
                      </>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
