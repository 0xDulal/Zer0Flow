import { randomUUID } from "node:crypto";

import { logger, schemaTask } from "@trigger.dev/sdk";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { inspectWebsite } from "@/lib/website-audit/inspect";

const websiteAuditPayloadSchema = z.object({
  auditId: z.uuid("payload auditId must be a valid UUID"),
});

/**
 * Background task driving the Website Audit Engine.
 *
 * Payload contains ONLY the audit id. Workspace, lead, and URL are resolved
 * from the database; the task never trusts client-supplied workspace/lead/URL
 * values. The Zod schema rejects malformed payloads before `run` executes.
 *
 * State machine (defensive on top of the Server Action's idempotency key):
 *   QUEUED    -> atomic claim: QUEUED -> RUNNING, stamping a fresh claim token
 *                and started_at. Only one execution can win the guarded update.
 *   RUNNING   -> return. Stale RUNNING rows are re-queued exclusively by the
 *                scheduled `website-audit-recovery` task, never in-task.
 *   COMPLETED -> return
 *   FAILED    -> return
 *
 * Ownership is fenced by a per-execution claim token: terminal writes
 * (COMPLETED / FAILED) only match while the row is still RUNNING AND carries
 * the execution's own token. If the row was recovered and re-queued meanwhile,
 * the guarded write matches nothing and this execution backs off instead of
 * overwriting the (now owned by someone else) row.
 */
export const websiteAuditTask = schemaTask({
  id: "website-audit",
  description: "Runs the Playwright website audit for a website_audits row.",
  schema: websiteAuditPayloadSchema,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 10_000,
    randomize: true,
  },
  machine: "small-2x",
  maxDuration: 60,
  run: async ({ auditId }) => {
    const supabase = createAdminClient();
    const claimToken = randomUUID();

    const { data: audit, error } = await supabase
      .from("website_audits")
      .select("id, url, status")
      .eq("id", auditId)
      .maybeSingle();

    if (error) {
      logger.error("website-audit: failed to load audit", {
        auditId,
        error: error.message,
      });
      throw error;
    }

    if (!audit) {
      logger.warn("website-audit: audit not found", { auditId });
      return;
    }

    if (audit.status !== "QUEUED") {
      logger.info("website-audit: audit is not queued, skipping", {
        auditId,
        status: audit.status,
      });
      return;
    }

    const claim = await claimAudit(supabase, auditId, claimToken);

    if (!claim.matched) {
      if (claim.error) {
        logger.error("website-audit: failed to claim audit", {
          auditId,
          error: claim.error.message,
        });
        throw claim.error;
      }

      logger.info("website-audit: audit was claimed by another execution", {
        auditId,
      });
      return;
    }

    logger.info("website-audit: audit claimed", { auditId, url: audit.url });

    const result = await inspectWebsite(audit.url);

    if (result.ok) {
      const terminal = await finalizeAudit(supabase, auditId, claimToken, {
        status: "COMPLETED",
        error: null,
        final_url: result.data.finalUrl,
        facts: result.data.facts,
      });

      if (!terminal.matched) {
        if (terminal.error) {
          logger.error("website-audit: failed to record completion", {
            auditId,
            error: terminal.error.message,
          });
          throw terminal.error;
        }

        logger.warn(
          "website-audit: lost ownership before recording completion",
          { auditId },
        );
        return;
      }

      logger.info("website-audit: completed", { auditId });
      return;
    }

    if (result.error.retryable) {
      // Infrastructure/browser failure (BROWSER_ERROR, INSPECTION_FAILED):
      // throw so Trigger.dev retries this run under maxAttempts. Nothing is
      // persisted — the row stays RUNNING and, if retries are exhausted, the
      // scheduled recovery task re-queues it. The thrown message is safe and is
      // never written to the audit row.
      logger.warn("website-audit: retryable inspection failure", {
        auditId,
        code: result.error.code,
      });
      throw new Error(
        `Website inspection failed (${result.error.code}); the browser environment will be retried.`,
      );
    }

    // Expected website failure: persist a safe, concise error and do NOT
    // throw. These are deterministic domain errors, not infrastructure errors.
    const terminal = await finalizeAudit(supabase, auditId, claimToken, {
      status: "FAILED",
      error: result.error.message,
    });

    if (!terminal.matched) {
      if (terminal.error) {
        logger.error("website-audit: failed to record failure", {
          auditId,
          error: terminal.error.message,
        });
        throw terminal.error;
      }

      logger.warn("website-audit: lost ownership before recording failure", {
        auditId,
      });
      return;
    }

    logger.warn("website-audit: inspection failed", {
      auditId,
      code: result.error.code,
    });
  },
});

type GuardedUpdateResult =
  | { matched: true }
  | { matched: false; error: null }
  | { matched: false; error: PostgrestError };

type AuditTerminalUpdate = {
  status: Database["public"]["Enums"]["audit_status"];
  error: string | null;
  final_url?: string | null;
  facts?: Database["public"]["Tables"]["website_audits"]["Row"]["facts"];
};

/**
 * Atomic claim: only this update can flip QUEUED -> RUNNING. The guarded
 * match (`status = 'QUEUED'` re-checked by the DB) guarantees exactly one
 * execution owns the row; a claim that returns no row means it lost the race.
 */
async function claimAudit(
  supabase: SupabaseClient<Database>,
  auditId: string,
  claimToken: string,
): Promise<GuardedUpdateResult> {
  const { data, error } = await supabase
    .from("website_audits")
    .update({
      status: "RUNNING",
      started_at: new Date().toISOString(),
      claim_token: claimToken,
      updated_at: new Date().toISOString(),
    })
    .eq("id", auditId)
    .eq("status", "QUEUED")
    .select("id")
    .maybeSingle();

  if (error) return { matched: false, error };
  return data ? { matched: true } : { matched: false, error: null };
}

/**
 * Write a terminal state guarded by ownership: only matches while the row is
 * still RUNNING and still carries THIS execution's claim token. Returning no
 * row means ownership was recovered/re-queued meanwhile, in which case the
 * caller must NOT overwrite anything (fencing). Ownership fields are cleared
 * so a recovered row can never be reached by a stale worker again.
 */
async function finalizeAudit(
  supabase: SupabaseClient<Database>,
  auditId: string,
  claimToken: string,
  terminal: AuditTerminalUpdate,
): Promise<GuardedUpdateResult> {
  const { data, error } = await supabase
    .from("website_audits")
    .update({
      ...terminal,
      claim_token: null,
      started_at: null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", auditId)
    .eq("status", "RUNNING")
    .eq("claim_token", claimToken)
    .select("id")
    .maybeSingle();

  if (error) return { matched: false, error };
  return data ? { matched: true } : { matched: false, error: null };
}