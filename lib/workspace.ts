import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type TypedClient = SupabaseClient<Database>;

export function workspaceNameFromEmail(email?: string): string {
  const local = (email ?? "").split("@")[0] ?? "";
  const words = local.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const pretty = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return pretty ? `${pretty} Workspace` : "My Workspace";
}

export function workspaceSlugFromEmail(email?: string): string {
  const local = (email ?? "").split("@")[0]?.toLowerCase() ?? "";
  const base = local.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const suffix = crypto.randomUUID().replace(/[^a-z0-9]/g, "").slice(0, 8);
  const combined = base ? `${base}-${suffix}` : `ws-${suffix}`;

  return combined.slice(0, 63).replace(/-+$/g, "");
}

/**
 * Ensures the signed-in user has a workspace. Idempotent: only calls the
 * SECURITY DEFINER `bootstrap_workspace` function when the user has no
 * membership yet. Never inserts into workspaces/workspace_members directly.
 */
export async function ensureWorkspace(
  client: TypedClient,
  email?: string,
): Promise<{ error?: string }> {
  const { data: memberships, error: membershipError } = await client
    .from("workspace_members")
    .select("id")
    .limit(1);

  if (membershipError) {
    return { error: membershipError.message };
  }

  if (memberships && memberships.length > 0) {
    return {};
  }

  const { error } = await client.rpc("bootstrap_workspace", {
    p_name: workspaceNameFromEmail(email),
    p_slug: workspaceSlugFromEmail(email),
  });

  if (error) {
    return { error: error.message };
  }

  return {};
}
