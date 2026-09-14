"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { labelize } from "@/lib/leads/format";
import { isPipelineStage, statusForStage } from "@/lib/leads/pipeline";
import { createClient } from "@/lib/supabase/server";

export type UpdateLeadStageResult = {
  ok: boolean;
  error?: string;
  /** Set when the stage moved but the activity could not be logged. */
  activityError?: string;
};

const GENERIC_ERROR = "Could not update the lead. Please try again.";

/**
 * Moves a lead to a new pipeline stage. The lifecycle `status` is always
 * derived server-side from the target stage (never accepted from the client),
 * and `workspace_id` is never accepted from the client.
 */
export async function updateLeadStage(
  leadId: string,
  targetStage: string,
): Promise<UpdateLeadStageResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (typeof leadId !== "string" || leadId.length === 0) {
    return { ok: false, error: "Missing lead." };
  }

  if (!isPipelineStage(targetStage)) {
    return { ok: false, error: "Invalid pipeline stage." };
  }

  // RLS scopes this lookup to the caller's workspace; an inaccessible lead
  // returns null, and we never reveal whether another workspace owns it.
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, workspace_id, stage, status")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) {
    console.error("Failed to load lead for stage update:", leadError.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  if (!lead) {
    return { ok: false, error: "Lead not found." };
  }

  if (lead.stage === targetStage) {
    return { ok: true };
  }

  const nextStatus = statusForStage(targetStage);

  const { data: updated, error: updateError } = await supabase
    .from("leads")
    .update({ stage: targetStage, status: nextStatus })
    .eq("id", lead.id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("Failed to update lead stage:", updateError.message);
    return { ok: false, error: GENERIC_ERROR };
  }

  if (!updated) {
    return { ok: false, error: "Lead not found." };
  }

  // Use the lead's own workspace_id so the activity integrity trigger and RLS
  // remain satisfied.
  const { error: activityError } = await supabase.from("activities").insert({
    workspace_id: lead.workspace_id,
    lead_id: lead.id,
    type: "NOTE",
    title: "Stage changed",
    description: `${labelize(lead.stage)} → ${labelize(targetStage)}`,
    metadata: { from: lead.stage, to: targetStage },
  });

  revalidatePath("/dashboard/pipeline");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");

  if (activityError) {
    console.error(
      "Failed to log stage-change activity:",
      activityError.message,
    );
    return {
      ok: true,
      activityError: "Stage updated, but the activity could not be logged.",
    };
  }

  return { ok: true };
}
