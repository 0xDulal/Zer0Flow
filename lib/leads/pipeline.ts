import { Constants } from "@/lib/supabase/database.types";

import type { LeadStatus, PipelineStage } from "./format";

/**
 * Canonical pipeline stage order. Sourced from the generated database types so
 * the UI can never drift from the `pipeline_stage` enum.
 */
export const PIPELINE_STAGES: readonly PipelineStage[] =
  Constants.public.Enums.pipeline_stage;

/**
 * Revenue-producing stages shown as active pipeline columns.
 */
export const PIPELINE_REVENUE_STAGES: readonly PipelineStage[] = [
  "PROSPECT",
  "RESEARCHED",
  "CONTACTED",
  "REPLIED",
  "QUALIFIED",
  "CALL_BOOKED",
  "CALL_DONE",
  "PROPOSAL",
  "NEGOTIATION",
];

/**
 * Terminal stages shown separately from the active pipeline.
 */
export const PIPELINE_TERMINAL_STAGES: readonly PipelineStage[] = [
  "WON",
  "LOST",
  "NURTURE",
];

/**
 * Position of each stage in the pipeline (later stage = higher rank).
 */
export const STAGE_RANK: ReadonlyMap<PipelineStage, number> = new Map(
  PIPELINE_STAGES.map(
    (stage, index): [PipelineStage, number] => [stage, index],
  ),
);

/**
 * Canonical stage → lifecycle status mapping. The status is always derived
 * server-side from the stage; `PAUSED` is never produced here.
 */
export const STAGE_TO_STATUS: Record<PipelineStage, LeadStatus> = {
  PROSPECT: "ACTIVE",
  RESEARCHED: "ACTIVE",
  CONTACTED: "ACTIVE",
  REPLIED: "ACTIVE",
  QUALIFIED: "ACTIVE",
  CALL_BOOKED: "ACTIVE",
  CALL_DONE: "ACTIVE",
  PROPOSAL: "ACTIVE",
  NEGOTIATION: "ACTIVE",
  WON: "WON",
  LOST: "LOST",
  NURTURE: "NURTURE",
};

export function statusForStage(stage: PipelineStage): LeadStatus {
  return STAGE_TO_STATUS[stage];
}

export function isPipelineStage(value: unknown): value is PipelineStage {
  return (
    typeof value === "string" &&
    (Constants.public.Enums.pipeline_stage as readonly string[]).includes(value)
  );
}

export type PipelineStageSummary = {
  stage: PipelineStage;
  count: number;
  value: number;
};

type StageGroupableLead = {
  stage: PipelineStage;
  deal_value: number | null;
};

/**
 * Groups leads by stage (all 12 stages, in canonical order) with their count
 * and total deal value. Shared by the dashboard summary and the pipeline board.
 */
export function groupLeadsByStage<T extends StageGroupableLead>(
  leads: readonly T[],
): PipelineStageSummary[] {
  return PIPELINE_STAGES.map((stage) => {
    const stageLeads = leads.filter((lead) => lead.stage === stage);

    return {
      stage,
      count: stageLeads.length,
      value: stageLeads.reduce(
        (total, lead) => total + (lead.deal_value ?? 0),
        0,
      ),
    };
  });
}
