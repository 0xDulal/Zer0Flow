import type { Database } from "@/lib/supabase/database.types";
import type { LeadTemperature } from "@/lib/leads/format";
import {
  groupLeadsByStage,
  STAGE_RANK,
  type PipelineStageSummary,
} from "@/lib/leads/pipeline";
import { createClient } from "@/lib/supabase/server";

type TypedClient = Awaited<ReturnType<typeof createClient>>;

export type DashboardLead = Pick<
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
  | "next_action"
  | "next_action_at"
>;

export type DashboardAction = {
  lead: DashboardLead;
  dueAt: string;
  dueState: "overdue" | "today";
};

export type UpcomingAction = {
  lead: DashboardLead;
  dueAt: string;
};

export type DashboardMetrics = {
  activeLeads: number;
  hotLeads: number;
  openPipeline: number;
  weightedPipeline: number;
};

export type RecentActivityItem = {
  id: string;
  title: string;
  type: Database["public"]["Enums"]["activity_type"];
  occurredAt: string;
  leadId: string | null;
  leadName: string | null;
};

export type DashboardData = {
  hasLeads: boolean;
  metrics: DashboardMetrics;
  pipeline: PipelineStageSummary[];
  todaysActions: DashboardAction[];
  upcomingActions: UpcomingAction[];
  hotOpportunities: DashboardLead[];
  recentActivity: RecentActivityItem[];
};

export type DashboardResult = {
  data: DashboardData | null;
  error?: string;
};

const TODAY_ACTION_LIMIT = 7;
const UPCOMING_LIMIT = 5;
const HOT_OPPORTUNITY_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 8;

const TEMPERATURE_RANK: Record<LeadTemperature, number> = {
  HOT: 3,
  WARM: 2,
  COLD: 1,
  DORMANT: 0,
};

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function compareTemperature(a: LeadTemperature, b: LeadTemperature): number {
  return TEMPERATURE_RANK[b] - TEMPERATURE_RANK[a];
}

function dueStateFor(
  dueAt: Date,
  startOfToday: Date,
  startOfTomorrow: Date,
): DashboardAction["dueState"] | null {
  if (dueAt < startOfToday) {
    return "overdue";
  }

  if (dueAt < startOfTomorrow) {
    return "today";
  }

  return null;
}

function compareTodaysActions(a: DashboardAction, b: DashboardAction): number {
  // 1. overdue before today
  if (a.dueState !== b.dueState) {
    return a.dueState === "overdue" ? -1 : 1;
  }

  // 2. hotter first
  const temperature = compareTemperature(a.lead.temperature, b.lead.temperature);
  if (temperature !== 0) {
    return temperature;
  }

  // 3. higher deal value
  const value = (b.lead.deal_value ?? 0) - (a.lead.deal_value ?? 0);
  if (value !== 0) {
    return value;
  }

  // 4. later pipeline stage
  const stage = (STAGE_RANK.get(b.lead.stage) ?? 0) - (STAGE_RANK.get(a.lead.stage) ?? 0);
  if (stage !== 0) {
    return stage;
  }

  // 5. higher opportunity score
  return (b.lead.opportunity_score ?? 0) - (a.lead.opportunity_score ?? 0);
}

function compareHotOpportunities(a: DashboardLead, b: DashboardLead): number {
  const temperature = compareTemperature(a.temperature, b.temperature);
  if (temperature !== 0) {
    return temperature;
  }

  const score = (b.opportunity_score ?? 0) - (a.opportunity_score ?? 0);
  if (score !== 0) {
    return score;
  }

  const value = (b.deal_value ?? 0) - (a.deal_value ?? 0);
  if (value !== 0) {
    return value;
  }

  return (STAGE_RANK.get(b.stage) ?? 0) - (STAGE_RANK.get(a.stage) ?? 0);
}

/**
 * Loads everything the dashboard needs in two workspace-scoped queries and
 * derives the action lists, metrics and pipeline summary in memory.
 *
 * Reads rely on RLS (is_workspace_member) — no workspace_id is accepted from
 * the client, and the secret/service-role key is never used.
 */
export async function loadDashboard(
  client: TypedClient,
): Promise<DashboardResult> {
  const now = new Date();
  const startOfToday = startOfDay(now);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const [leadsResult, activitiesResult] = await Promise.all([
    client
      .from("leads")
      .select(
        "id, full_name, company_name, stage, status, temperature, deal_value, probability, opportunity_score, next_action, next_action_at",
      ),
    client
      .from("activities")
      .select("id, title, type, occurred_at, lead_id, leads(full_name)")
      .order("occurred_at", { ascending: false })
      .limit(RECENT_ACTIVITY_LIMIT),
  ]);

  if (leadsResult.error) {
    return { data: null, error: leadsResult.error.message };
  }

  if (activitiesResult.error) {
    return { data: null, error: activitiesResult.error.message };
  }

  const leads: DashboardLead[] = leadsResult.data ?? [];

  const activeLeads = leads.filter((lead) => lead.status === "ACTIVE");

  const metrics: DashboardMetrics = {
    activeLeads: activeLeads.length,
    hotLeads: activeLeads.filter((lead) => lead.temperature === "HOT").length,
    openPipeline: activeLeads.reduce(
      (total, lead) => total + (lead.deal_value ?? 0),
      0,
    ),
    weightedPipeline: activeLeads.reduce(
      (total, lead) =>
        total + ((lead.deal_value ?? 0) * (lead.probability ?? 0)) / 100,
      0,
    ),
  };

  const pipeline: PipelineStageSummary[] = groupLeadsByStage(leads);

  const todaysActions = activeLeads
    .map((lead): DashboardAction | null => {
      const nextAction = lead.next_action?.trim();
      const nextActionAt = lead.next_action_at;

      if (!nextAction || !nextActionAt) {
        return null;
      }

      const dueAt = new Date(nextActionAt);

      if (Number.isNaN(dueAt.getTime())) {
        return null;
      }

      const dueState = dueStateFor(dueAt, startOfToday, startOfTomorrow);

      if (!dueState) {
        return null;
      }

      return { lead, dueAt: nextActionAt, dueState };
    })
    .filter((action): action is DashboardAction => action !== null)
    .sort(compareTodaysActions)
    .slice(0, TODAY_ACTION_LIMIT);

  const upcomingActions = activeLeads
    .map((action): UpcomingAction | null => {
      const nextAction = action.next_action?.trim();
      const nextActionAt = action.next_action_at;

      if (!nextAction || !nextActionAt) {
        return null;
      }

      const dueAt = new Date(nextActionAt);

      if (Number.isNaN(dueAt.getTime()) || dueAt < startOfTomorrow) {
        return null;
      }

      return { lead: action, dueAt: nextActionAt };
    })
    .filter((action): action is UpcomingAction => action !== null)
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, UPCOMING_LIMIT);

  const hotOpportunities = [...activeLeads]
    .sort(compareHotOpportunities)
    .slice(0, HOT_OPPORTUNITY_LIMIT);

  const recentActivity: RecentActivityItem[] = (
    activitiesResult.data ?? []
  ).map((activity) => ({
    id: activity.id,
    title: activity.title,
    type: activity.type,
    occurredAt: activity.occurred_at,
    leadId: activity.lead_id ?? null,
    leadName: activity.leads?.full_name ?? null,
  }));

  return {
    data: {
      hasLeads: leads.length > 0,
      metrics,
      pipeline,
      todaysActions,
      upcomingActions,
      hotOpportunities,
      recentActivity,
    },
  };
}
