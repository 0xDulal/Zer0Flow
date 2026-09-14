import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { RecentActivityItem } from "@/lib/dashboard/queries";
import { formatDateTime, labelize } from "@/lib/leads/format";

export function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">
          Recent activity
        </h2>
        <p className="text-sm text-muted-foreground">
          The latest touchpoints across your leads.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
          No activity yet.
        </div>
      ) : (
        <Card className="py-0">
          <ul className="divide-y">
            {items.map((item) => {
              const body = (
                <div className="flex gap-3">
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-border"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm">{item.title}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      {item.leadName ? (
                        <span className="font-medium text-foreground">
                          {item.leadName}
                        </span>
                      ) : null}
                      <Badge variant="muted">{labelize(item.type)}</Badge>
                      <span>{formatDateTime(item.occurredAt)}</span>
                    </div>
                  </div>
                </div>
              );

              return (
                <li key={item.id}>
                  {item.leadId ? (
                    <Link
                      href={`/dashboard/leads/${item.leadId}`}
                      className="block px-6 py-3.5 transition-colors hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset focus-visible:outline-none"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="px-6 py-3.5">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </section>
  );
}
