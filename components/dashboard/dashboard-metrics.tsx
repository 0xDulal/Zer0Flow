import type { DashboardMetrics } from "@/lib/dashboard/queries";
import { formatCurrency } from "@/lib/leads/format";

export function DashboardMetrics({ metrics }: { metrics: DashboardMetrics }) {
  const items = [
    { label: "Active leads", value: String(metrics.activeLeads) },
    { label: "Hot leads", value: String(metrics.hotLeads) },
    { label: "Open pipeline", value: formatCurrency(metrics.openPipeline) },
    {
      label: "Weighted pipeline",
      value: formatCurrency(metrics.weightedPipeline),
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border">
      {items.map((item) => (
        <div key={item.label} className="bg-card p-4">
          <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {item.label}
          </dt>
          <dd className="mt-1 text-lg font-semibold tabular-nums tracking-tight">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
