import { Constants } from "@/lib/supabase/database.types";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type TypedClient = Awaited<ReturnType<typeof createClient>>;

export type ActivityType = Database["public"]["Enums"]["activity_type"];
export type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];

/**
 * Typed metadata for the activity kinds Zer0Flow records today. Callers cannot
 * pass an arbitrary metadata blob.
 */
export type ActivityMetadata = {
  outcome?: string;
  from?: string;
  to?: string;
};

export type RecordActivityInput = {
  client: TypedClient;
  leadId: string;
  type: ActivityType;
  title: string;
  description?: string | null;
  metadata?: ActivityMetadata | null;
};

export type RecordActivityResult =
  | { ok: true; activity: ActivityRow }
  | { ok: false; error: string };

function isActivityType(value: unknown): value is ActivityType {
  return (
    typeof value === "string" &&
    (Constants.public.Enums.activity_type as readonly string[]).includes(value)
  );
}

function sanitizeMetadata(
  metadata: ActivityMetadata | null | undefined,
): Json | null {
  if (!metadata) {
    return null;
  }

  const entries: Record<string, string> = {};

  if (typeof metadata.outcome === "string" && metadata.outcome.trim()) {
    entries.outcome = metadata.outcome.trim();
  }

  if (typeof metadata.from === "string" && metadata.from.trim()) {
    entries.from = metadata.from.trim();
  }

  if (typeof metadata.to === "string" && metadata.to.trim()) {
    entries.to = metadata.to.trim();
  }

  return Object.keys(entries).length > 0 ? entries : null;
}

/**
 * Records a workspace-scoped activity against a lead. The workspace is always
 * derived from the lead (RLS-scoped) — never accepted from the caller — and
 * `occurred_at` is left to the database default.
 */
export async function recordActivity(
  input: RecordActivityInput,
): Promise<RecordActivityResult> {
  const { client, leadId, type, title } = input;

  if (typeof leadId !== "string" || leadId.length === 0) {
    return { ok: false, error: "Lead not found." };
  }

  if (!isActivityType(type)) {
    return { ok: false, error: "Unsupported activity type." };
  }

  if (typeof title !== "string" || title.trim().length === 0) {
    return { ok: false, error: "Activity title is required." };
  }

  // RLS scopes this to the caller's workspace; an inaccessible lead is null.
  const { data: lead, error: leadError } = await client
    .from("leads")
    .select("id, workspace_id")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) {
    console.error("recordActivity: failed to load lead", leadError.message);
    return { ok: false, error: "Lead not found." };
  }

  if (!lead) {
    return { ok: false, error: "Lead not found." };
  }

  const description = input.description?.trim();

  const { data: activity, error: insertError } = await client
    .from("activities")
    .insert({
      workspace_id: lead.workspace_id,
      lead_id: lead.id,
      type,
      title: title.trim(),
      description: description && description.length > 0 ? description : null,
      metadata: sanitizeMetadata(input.metadata),
    })
    .select("*")
    .single();

  if (insertError || !activity) {
    console.error("recordActivity: insert failed", insertError?.message);
    return { ok: false, error: "Unable to record activity." };
  }

  return { ok: true, activity };
}
