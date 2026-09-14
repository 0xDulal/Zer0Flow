import type { Database } from "@/lib/supabase/database.types";
import type { PipelineStage } from "@/lib/leads/format";
import {
  PIPELINE_REVENUE_STAGES,
  PIPELINE_TERMINAL_STAGES,
  groupLeadsByStage,
  type PipelineStageSummary,
} from "@/lib/leads/pipeline";
import { createClient } from "@/lib/supabase/server";

type TypedClient = Awaited<ReturnType<typeof createClient>>;

export type PipelineLead = Pick<
  Database["public"]["Tables"]["leads"]["Row"],
  | "id"
  | "full_name"
  | "company_name"
  | "stage"
  | "status"
  | "temperature"
  | "deal_value"
  | "probability"
  | "opportunity_score"
  | "expected_close_date"
  | "next_action"
  | "next_action_at"
  | "updated_at"
>;

export type PipelineColumn = PipelineStageSummary & {
  leads: PipelineLead[];
};

export type PipelineData = {
  hasLeads: boolean;
  columns: PipelineColumn[];
  terminal: PipelineColumn[];
};

export type PipelineResult = {
  data: PipelineData | null;
  error?: string;
};

function buildColumns(
  leads: readonly PipelineLead[],
  summaries: readonly PipelineStageSummary[],
  stages: readonly PipelineStage[],
): PipelineColumn[] {
  const summaryByStage = new Map(
    summaries.map((summary) => [summary.stage, summary]),
  );

  return stages.map((stage) => {
    const stageLeads = leads
      .filter((lead) => lead.stage === stage)
      .sort(
        (a, b) =>
          (b.deal_value ?? 0) - (a.deal_value ?? 0) ||
          a.full_name.localeCompare(b.full_name),
      );

    const summary = summaryByStage.get(stage);

    return {
      stage,
      count: summary?.count ?? stageLeads.length,
      value: summary?.value ?? 0,
      leads: stageLeads,
    };
  });
}

/**
 * Loads the pipeline board for the current user's workspace in a single
 * workspace-scoped query, then groups by stage with the shared helper.
 *
 * Reads rely on RLS (is_workspace_member); no workspace_id is accepted from the
 * client and the secret/service-role key is never used.
 */
export async function loadPipeline(
  client: TypedClient,
): Promise<PipelineResult> {
  const { data, error } = await client
    .from("leads")
    .select(
      "id, full_name, company_name, stage, status, temperature, deal_value, probability, opportunity_score, expected_close_date, next_action, next_action_at, updated_at",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  const leads: PipelineLead[] = data ?? [];
  const summaries = groupLeadsByStage(leads);

  return {
    data: {
      hasLeads: leads.length > 0,
      columns: buildColumns(leads, summaries, PIPELINE_REVENUE_STAGES),
      terminal: buildColumns(leads, summaries, PIPELINE_TERMINAL_STAGES),
    },
  };
}
