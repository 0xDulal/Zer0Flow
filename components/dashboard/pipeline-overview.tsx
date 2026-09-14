import { Card, CardContent } from "@/components/ui/card";
import {
  PIPELINE_REVENUE_STAGES,
  PIPELINE_TERMINAL_STAGES,
  type PipelineStageSummary,
} from "@/lib/dashboard/queries";
import { formatCurrency, labelize } from "@/lib/leads/format";

function barWidth(
  value: number,
  count: number,
  maxValue: number,
  maxCount: number,
): number {
  if (maxValue > 0) {
    return (value / maxValue) * 100;
  }

  if (maxCount > 0) {
    return (count / maxCount) * 100;
  }

  return 0;
}

export function PipelineOverview({
  pipeline,
}: {
  pipeline: PipelineStageSummary[];
}) {
  const revenue = pipeline.filter((row) =>
    PIPELINE_REVENUE_STAGES.includes(row.stage),
  );
  const terminal = pipeline.filter((row) =>
    PIPELINE_TERMINAL_STAGES.includes(row.stage),
  );

  const maxValue = Math.max(0, ...revenue.map((row) => row.value));
  const maxCount = Math.max(0, ...revenue.map((row) => row.count));

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-base font-semibold tracking-tight">Pipeline</h2>
        <p className="text-sm text-muted-foreground">
          Where your opportunities are right now.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3">
          {revenue.map((row) => (
            <div
              key={row.stage}
              className="grid grid-cols-[minmax(5.5rem,7rem)_1fr_auto] items-center gap-3"
            >
              <span className="truncate text-sm text-muted-foreground">
                {labelize(row.stage)}
              </span>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground/80"
                  style={{
                    width: `${barWidth(row.value, row.count, maxValue, maxCount)}%`,
                  }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-right text-xs tabular-nums">
                <span className="font-medium text-foreground">
                  {formatCurrency(row.value)}
                </span>
                <span className="text-muted-foreground"> · {row.count}</span>
              </span>
            </div>
          ))}

          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
            {terminal.map((row) => (
              <span key={row.stage}>
                {labelize(row.stage)}:{" "}
                <span className="tabular-nums">{row.count}</span>
                {row.value > 0 ? (
                  <span className="tabular-nums">
                    {" "}
                    · {formatCurrency(row.value)}
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
