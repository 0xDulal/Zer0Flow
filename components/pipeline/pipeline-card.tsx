import Link from "next/link";
import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, labelize } from "@/lib/leads/format";
import type { LeadTemperature } from "@/lib/leads/format";
import type { PipelineLead } from "@/lib/pipeline/queries";

import { StageMoveMenu } from "./stage-move-menu";

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

type PipelineCardProps = {
  lead: PipelineLead;
  compact?: boolean;
};

export function PipelineCard({ lead, compact = false }: PipelineCardProps) {
  return (
    <article className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            href={`/dashboard/leads/${lead.id}`}
            className="block truncate text-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            {lead.full_name}
          </Link>
          {lead.company_name ? (
            <p className="truncate text-xs text-muted-foreground">
              {lead.company_name}
            </p>
          ) : null}
        </div>

        <StageMoveMenu leadId={lead.id} currentStage={lead.stage} />
      </div>

      {compact ? (
        <p className="mt-2 text-xs font-medium tabular-nums">
          {formatCurrency(lead.deal_value ?? 0)}
        </p>
      ) : (
        <>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="font-medium tabular-nums">
              {formatCurrency(lead.deal_value ?? 0)}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {lead.probability ?? 0}%
            </span>
            <Badge variant={temperatureVariant(lead.temperature)}>
              {labelize(lead.temperature)}
            </Badge>
          </div>

          {lead.next_action ? (
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
              {lead.next_action}
            </p>
          ) : null}

          {lead.expected_close_date ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Close {formatDate(lead.expected_close_date)}
            </p>
          ) : null}
        </>
      )}
    </article>
  );
}
