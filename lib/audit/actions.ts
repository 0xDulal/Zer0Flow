"use server";

import { redirect } from "next/navigation";

import { idempotencyKeys, tasks } from "@trigger.dev/sdk";

import { createClient } from "@/lib/supabase/server";
import {
  validateResolvedAddress,
  validateUrl,
} from "@/lib/website-audit/url-guard";
import { resolveWorkspaceId } from "@/lib/workspace";

import type { websiteAuditTask } from "@/trigger/website-audit";

export type StartAuditResult =
  | { ok: true; auditId: string }
  | { ok: false; error: string };

/**
 * Creates a QUEUED website_audits row for the authenticated user's lead, then
 * triggers the Trigger.dev `website-audit` task with only the audit id.
 *
 * The trigger uses an explicit GLOBAL idempotency key whose key material is the
 * audit id. This is the same mechanism (and key material) the recovery task uses
 * for an untokened QUEUED audit, so duplicate triggers for the same audit
 * deduplicate to a single run across processes. Generation-specific recovery
 * instead keys off the claim token, so it never deduplicates against this run.
 *
 * workspace_id comes from the user's membership (RLS-scoped), never the
 * caller. The URL comes from the lead row, never from a raw client input.
 */
export async function startWebsiteAudit(input: {
  leadId: string;
}): Promise<StartAuditResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const leadId = typeof input?.leadId === "string" ? input.leadId.trim() : "";

  if (!leadId) {
    return { ok: false, error: "Missing lead." };
  }

  const { workspaceId, error: workspaceError } = await resolveWorkspaceId(
    supabase,
    user.email ?? undefined,
  );

  if (!workspaceId) {
    return { ok: false, error: workspaceError ?? "No workspace is available." };
  }

  // RLS scopes the lookup to the caller's workspace; an inaccessible lead is not found.
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, website")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) {
    console.error("startWebsiteAudit: failed to load lead", leadError.message);
    return { ok: false, error: "Unable to start the audit." };
  }

  if (!lead) {
    return { ok: false, error: "Lead not found." };
  }

  const rawUrl = lead.website?.trim() ?? "";

  if (!rawUrl) {
    return { ok: false, error: "This lead has no website to audit." };
  }

  const parsed = validateUrl(rawUrl);
  if (!parsed.ok) {
    return { ok: false, error: "The lead's website URL is not valid." };
  }

  const resolved = await validateResolvedAddress(parsed.url);
  if (!resolved.ok) {
    return {
      ok: false,
      error:
        resolved.code === "DNS_RESOLVE_FAILED"
          ? "The lead's website address could not be resolved."
          : "The lead's website address is not allowed.",
    };
  }

  // status is always QUEUED; workspace_id is derived server-side.
  const { data: audit, error: insertError } = await supabase
    .from("website_audits")
    .insert({
      workspace_id: workspaceId,
      lead_id: lead.id,
      url: resolved.url,
      status: "QUEUED",
    })
    .select("id")
    .single();

  if (insertError || !audit) {
    console.error(
      "startWebsiteAudit: failed to create audit",
      insertError?.message,
    );
    return { ok: false, error: "Unable to start the audit." };
  }

  try {
    // Explicit global scope: raw Trigger.dev strings are run-scoped, which
    // would include this process's run id (none here) and attach inconsistent
    // scope metadata. The audit id is the key material for the initial
    // generation, matching the recovery task's untokened QUEUED self-heal.
    const idempotencyKey = await idempotencyKeys.create(audit.id, {
      scope: "global",
    });

    await tasks.trigger<typeof websiteAuditTask>(
      "website-audit",
      { auditId: audit.id },
      { idempotencyKey },
    );
  } catch (triggerError) {
    console.error(
      "startWebsiteAudit: failed to trigger audit task",
      triggerError,
    );
    // Best-effort: mark the row failed so it is never left QUEUED forever.
    // Trigger.dev's error details are never exposed to the user.
    await supabase
      .from("website_audits")
      .update({
        status: "FAILED",
        error: "Could not start the audit.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", audit.id);

    return {
      ok: false,
      error: "The audit could not be started. Please try again.",
    };
  }

  return { ok: true, auditId: audit.id };
}