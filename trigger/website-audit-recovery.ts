import { randomUUID } from "node:crypto";

import { idempotencyKeys, logger, schedules, tasks } from "@trigger.dev/sdk";

import { createAdminClient } from "@/lib/supabase/admin";

import type { websiteAuditTask } from "@/trigger/website-audit";

/**
 * A RUNNING audit may only be reclaimed when it is clearly stale. The audit
 * task's maxDuration is 60s, so a healthy execution should never hold RUNNING
 * for more than ~60 seconds. 5 minutes is a conservative multiple: wide enough
 * to absorb scheduling/teardown slack, clock skew between app and DB, and slow
 * retries, but still bounded so a crashed run can be recovered safely.
 * Never shorten this below the audit task's maxDuration without a good reason.
 */
const STALE_RUNNING_AFTER_MS = 5 * 60 * 1_000;

// Aligned with STALE_RUNNING_AFTER_MS: a row that goes stale is re-queued
// within at most ~2 intervals. Each sweep is one bounded scan plus guarded
// writes, and every re-trigger is idempotency-keyed, so the cadence is cheap.
const RECOVERY_CRON = "*/5 * * * *";

/**
 * Hard cap on how many rows each sweep loads and processes, per query. Keeps
 * the scheduled run within its execution budget and prevents loading the whole
 * table into memory. A backlog larger than this is drained over subsequent
 * scheduled runs; no pagination is needed for correctness because every sweep
 * is idempotent and the schedule repeats.
 */
const MAX_RECOVERY_BATCH = 25;

/**
 * Scheduled recovery for the Website Audit Engine.
 *
 * 1. Re-queues stale RUNNING rows (up to MAX_RECOVERY_BATCH): the guarded
 *    UPDATE (status still RUNNING, started_at still below the cutoff, both
 *    re-checked by the DB) is the fence — if the legit owner completed or
 *    refreshed meanwhile, it matches nothing and the row is left alone. A
 *    fresh claim token is written so the row belongs to a new generation.
 * 2. Re-triggers the `website-audit` task for every re-queued row using a
 *    GLOBAL idempotency key that encodes the generation
 *    (`recovered:<id>:<token>`). Global scope means the key is not mixed with
 *    the recovery run's id, so repeated sweeps produce the same key and Trigger
 *    dedupes them into one run. The generation token makes this key distinct
 *    from the initial `audit.id` key, so a stale generation is never deduped
 *    away by the original execution's idempotency key — recovery can always
 *    start a new legitimate execution once ownership is stale.
 * 3. Self-heals QUEUED rows (up to MAX_RECOVERY_BATCH). An idempotent
 *    re-trigger is harmless when the run already exists and is the only thing
 *    that can un-stick a row whose original trigger was lost, or a row that was
 *    re-queued above just before this sweep failed to reach the API. Rows
 *    carrying a recovery token use the generation key; an untokened row uses
 *    `audit.id` with global scope — the exact same key material and scope the
 *    initial Server Action creates — so the self-heal dedupes against that
 *    pending run instead of starting a duplicate.
 *
 * Infrastructure errors are re-thrown so Trigger retries the sweep; the
 * self-heal pass makes those retries converge even after a partial sweep.
 */
export const websiteAuditRecoveryTask = schedules.task({
  id: "website-audit-recovery",
  description:
    "Re-queues stale RUNNING website audits and self-heals stranded QUEUED audits.",
  cron: {
    pattern: RECOVERY_CRON,
    // The recovery task needs SUPABASE_SECRET_KEY, which is not configured in
    // development. Restricting the schedule to production avoids a stream of
    // failing sweeps while `npx trigger.dev dev` is running.
    environments: ["PRODUCTION"],
  },
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1_000,
    maxTimeoutInMs: 10_000,
    randomize: true,
  },
  queue: { concurrencyLimit: 1 },
  maxDuration: 60,
  run: async () => {
    const supabase = createAdminClient();

    const cutoff = new Date(Date.now() - STALE_RUNNING_AFTER_MS).toISOString();

    const { data: staleRuns, error: staleError } = await supabase
      .from("website_audits")
      .select("id, claim_token")
      .eq("status", "RUNNING")
      .lt("started_at", cutoff)
      .limit(MAX_RECOVERY_BATCH);

    if (staleError) {
      logger.error("website-audit-recovery: failed to load stale audits", {
        error: staleError.message,
      });
      throw staleError;
    }

    for (const stale of staleRuns ?? []) {
      const requeueToken = randomUUID();

      const { data: requeued, error: requeueError } = await supabase
        .from("website_audits")
        .update({
          status: "QUEUED",
          claim_token: requeueToken,
          started_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", stale.id)
        .eq("status", "RUNNING")
        .lt("started_at", cutoff)
        .select("id")
        .maybeSingle();

      if (requeueError) {
        logger.error("website-audit-recovery: failed to re-queue audit", {
          auditId: stale.id,
          error: requeueError.message,
        });
        throw requeueError;
      }

      if (!requeued) {
        logger.info("website-audit-recovery: audit resolved before re-queue", {
          auditId: stale.id,
        });
        continue;
      }

      logger.warn("website-audit-recovery: re-queued stale audit", {
        auditId: stale.id,
      });

      await triggerAudit(stale.id, `recovered:${stale.id}:${requeueToken}`);
    }

    const { data: queued, error: queuedError } = await supabase
      .from("website_audits")
      .select("id, claim_token")
      .eq("status", "QUEUED")
      .limit(MAX_RECOVERY_BATCH);

    if (queuedError) {
      logger.error("website-audit-recovery: failed to load queued audits", {
        error: queuedError.message,
      });
      throw queuedError;
    }

    for (const row of queued ?? []) {
      const keyMaterial = row.claim_token
        ? `recovered:${row.id}:${row.claim_token}`
        : row.id;
      await triggerAudit(row.id, keyMaterial);
    }
  },
});

/**
 * Idempotently triggers an audit run. The key is created with GLOBAL scope so
 * it does not include the recovery run id: the same key material therefore
 * resolves to the same key across separate scheduled sweeps, letting Trigger
 * dedupe rather than spawn a duplicate run every 5 minutes.
 */
async function triggerAudit(
  auditId: string,
  keyMaterial: string,
): Promise<void> {
  const idempotencyKey = await idempotencyKeys.create(keyMaterial, {
    scope: "global",
  });

  try {
    await tasks.trigger<typeof websiteAuditTask>(
      "website-audit",
      { auditId },
      { idempotencyKey },
    );
  } catch (error) {
    logger.error("website-audit-recovery: failed to trigger audit", {
      auditId,
      keyMaterial,
    });
    throw error;
  }
}