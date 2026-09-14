import Link from "next/link";

import { Card } from "@/components/ui/card";
import type { UpcomingAction } from "@/lib/dashboard/queries";
import { formatCurrency, formatDateTime } from "@/lib/leads/format";

export function UpcomingActions({ actions }: { actions: UpcomingAction[] }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">Upcoming</h2>
        <p className="text-sm text-muted-foreground">
          The next actions on your schedule.
        </p>
      </div>

      {actions.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
          Nothing scheduled yet.
        </div>
      ) : (
        <Card className="py-0">
          <ul className="divide-y">
            {actions.map((action) => (
              <li key={action.lead.id}>
                <Link
                  href={`/dashboard/leads/${action.lead.id}`}
                  className="group flex items-start justify-between gap-3 px-6 py-3.5 transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium">
                      {action.lead.full_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {action.lead.next_action}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(action.dueAt)}
                    </p>
                    <p className="text-xs font-medium tabular-nums text-foreground">
                      {formatCurrency(action.lead.deal_value ?? 0)}
                    </p>
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
