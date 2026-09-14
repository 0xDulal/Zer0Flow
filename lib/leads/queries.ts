import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

import type { LeadStatusFilter } from "./format";

type TypedClient = Awaited<ReturnType<typeof createClient>>;

export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];
export type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];

export type ListLeadsResult = {
  leads: LeadRow[];
  count: number;
  error?: string;
};

export async function listLeads(
  client: TypedClient,
  params: { status: LeadStatusFilter; query: string },
): Promise<ListLeadsResult> {
  let request = client.from("leads").select("*", { count: "exact" });

  if (params.status !== "ALL") {
    request = request.eq("status", params.status);
  }

  const term = params.query.replace(/[%,()]/g, " ").trim();

  if (term) {
    request = request.or(
      `full_name.ilike.%${term}%,company_name.ilike.%${term}%,email.ilike.%${term}%`,
    );
  }

  const { data, count, error } = await request
    .order("next_action_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    return { leads: [], count: 0, error: error.message };
  }

  const leads = data ?? [];

  return { leads, count: count ?? leads.length };
}

export async function getLeadById(
  client: TypedClient,
  id: string,
): Promise<{ lead: LeadRow | null; error?: string }> {
  const { data, error } = await client
    .from("leads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return { lead: null, error: error.message };
  }

  return { lead: data };
}

export async function getLeadActivities(
  client: TypedClient,
  leadId: string,
): Promise<{ activities: ActivityRow[]; error?: string }> {
  const { data, error } = await client
    .from("activities")
    .select("*")
    .eq("lead_id", leadId)
    .order("occurred_at", { ascending: false });

  if (error) {
    return { activities: [], error: error.message };
  }

  return { activities: data ?? [] };
}
