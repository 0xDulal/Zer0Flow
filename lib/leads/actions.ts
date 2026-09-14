"use server";

import { redirect } from "next/navigation";

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
