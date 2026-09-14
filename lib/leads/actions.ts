"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordActivity } from "@/lib/activities/record-activity";
import { createClient } from "@/lib/supabase/server";
import { resolveWorkspaceId } from "@/lib/workspace";

import { parseLeadForm } from "./validation";

export type LeadFormState = {
  error?: string;
};

export async function createLead(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = parseLeadForm(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const { workspaceId, error: workspaceError } = await resolveWorkspaceId(
    supabase,
    user.email ?? undefined,
  );

  if (!workspaceId) {
    return { error: workspaceError ?? "No workspace is available." };
  }

  // workspace_id comes from the authenticated membership, never the form.
  const { data: lead, error } = await supabase
    .from("leads")
    .insert({ ...parsed.values, workspace_id: workspaceId })
    .select("id")
    .single();

  if (error || !lead) {
    return { error: error?.message ?? "Could not create the lead." };
  }

  const { error: activityError } = await supabase.from("activities").insert({
    workspace_id: workspaceId,
    lead_id: lead.id,
    type: "LEAD_CREATED",
    title: "Lead created",
    description: `${parsed.values.full_name} was added as a lead.`,
  });

  if (activityError) {
    redirect(`/dashboard/leads/${lead.id}?activity=failed`);
  }

  redirect(`/dashboard/leads/${lead.id}`);
}

export async function updateLead(
  _prevState: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const leadId = formData.get("lead_id");

  if (typeof leadId !== "string" || leadId.length === 0) {
    return { error: "Missing lead id." };
  }

  const parsed = parseLeadForm(formData);

  if ("error" in parsed) {
    return { error: parsed.error };
  }

  // RLS scopes the update to the caller's workspace; workspace_id is never
  // taken from the form and is not modified here.
  const { data: updated, error } = await supabase
    .from("leads")
    .update(parsed.values)
    .eq("id", leadId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!updated) {
    return { error: "That lead could not be found." };
  }

  redirect(`/dashboard/leads/${leadId}`);
}

const MAX_NEXT_ACTION_LENGTH = 500;
const MAX_OUTCOME_LENGTH = 1000;

export type NextActionInput = {
  leadId: string;
  nextAction: string;
  nextActionAt: string | null;
};

export type NextActionResult =
  | { ok: true }
  | { ok: false; error: string };

export type CompleteNextActionInput = {
  leadId: string;
  outcome?: string;
  nextAction?: string;
  nextActionAt?: string | null;
};

export type CompleteNextActionResult =
  | { ok: true }
  | { ok: false; error: string; recorded?: boolean };

type ParsedNextAction =
  | { ok: true; nextAction: string | null; nextActionAt: string | null }
  | { ok: false; error: string };

function parseNextActionFields(
  rawAction: string,
  rawAt: string | null,
): ParsedNextAction {
  const nextAction = rawAction.trim();

  if (nextAction.length > MAX_NEXT_ACTION_LENGTH) {
    return {
      ok: false,
      error: `Next action must be ${MAX_NEXT_ACTION_LENGTH} characters or fewer.`,
    };
  }

  const action = nextAction.length > 0 ? nextAction : null;
  const at = rawAt?.trim() ?? "";

  if (!at) {
    return { ok: true, nextAction: action, nextActionAt: null };
  }

  if (!action) {
    return { ok: false, error: "Add a next action to schedule a date." };
  }

  const parsed = new Date(at);

  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: "Enter a valid due date and time." };
  }

  return { ok: true, nextAction: action, nextActionAt: parsed.toISOString() };
}

/**
 * Sets or edits the current next action without recording an activity
 * (scheduling is planning, not an event). Updates only next_action /
 * next_action_at; stage and status are never touched.
 */
export async function setLeadNextAction(
  input: NextActionInput,
): Promise<NextActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const leadId =
    typeof input?.leadId === "string" ? input.leadId.trim() : "";

  if (!leadId) {
    return { ok: false, error: "Missing lead." };
  }

  const parsed = parseNextActionFields(
    input.nextAction ?? "",
    input.nextActionAt ?? null,
  );

  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  // RLS scopes this lookup; an inaccessible lead is not found.
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) {
    console.error("setLeadNextAction: failed to load lead", leadError.message);
    return { ok: false, error: "Unable to save next action." };
  }

  if (!lead) {
    return { ok: false, error: "Lead not found." };
  }

  const { data: updated, error: updateError } = await supabase
    .from("leads")
    .update({
      next_action: parsed.nextAction,
      next_action_at: parsed.nextActionAt,
    })
    .eq("id", leadId)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("setLeadNextAction: update failed", updateError.message);
    return { ok: false, error: "Unable to save next action." };
  }

  if (!updated) {
    return { ok: false, error: "Lead not found." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${leadId}`);

  return { ok: true };
}

/**
 * Completes the current next action: records a FOLLOW_UP activity, then clears
 * (or replaces) the stored next action. History is written first so a partial
 * failure never silently deletes the user's current action.
 */
export async function completeLeadNextAction(
  input: CompleteNextActionInput,
): Promise<CompleteNextActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const leadId =
    typeof input?.leadId === "string" ? input.leadId.trim() : "";

  if (!leadId) {
    return { ok: false, error: "Missing lead." };
  }

  const outcome = (input.outcome ?? "").trim();

  if (outcome.length > MAX_OUTCOME_LENGTH) {
    return {
      ok: false,
      error: `Outcome must be ${MAX_OUTCOME_LENGTH} characters or fewer.`,
    };
  }

  const parsed = parseNextActionFields(
    input.nextAction ?? "",
    input.nextActionAt ?? null,
  );

  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, next_action")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) {
    console.error(
      "completeLeadNextAction: failed to load lead",
      leadError.message,
    );
    return { ok: false, error: "Unable to complete follow-up." };
  }

  if (!lead) {
    return { ok: false, error: "Lead not found." };
  }

  const previousNextAction = lead.next_action?.trim() ?? "";

  if (!previousNextAction) {
    return { ok: false, error: "There is no next action to complete." };
  }

  // 1. Record history first (never loses the action if the next write fails).
  const recorded = await recordActivity({
    client: supabase,
    leadId: lead.id,
    type: "FOLLOW_UP",
    title: "Follow-up completed",
    description: outcome || `Followed up: ${previousNextAction}`,
    metadata: outcome ? { outcome } : null,
  });

  if (!recorded.ok) {
    return { ok: false, error: "Unable to complete follow-up." };
  }

  // 2. Then clear/replace the current next action.
  const { data: updated, error: updateError } = await supabase
    .from("leads")
    .update({
      next_action: parsed.nextAction,
      next_action_at: parsed.nextActionAt,
    })
    .eq("id", leadId)
    .select("id")
    .maybeSingle();

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
  revalidatePath(`/dashboard/leads/${leadId}`);

  if (updateError || !updated) {
    console.error(
      "completeLeadNextAction: lead update failed",
      updateError?.message,
    );
    return {
      ok: false,
      error:
        "Follow-up was recorded, but the next action could not be updated. Please review the lead.",
      recorded: true,
    };
  }

  return { ok: true };
}
