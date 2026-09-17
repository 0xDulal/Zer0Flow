-- ============================================================================
-- Zer0Flow: website_audits claim token
--
-- Adds a per-execution ownership token used by the Trigger.dev website-audit
-- job chain:
--
--   1. An execution claims a QUEUED audit by moving it to RUNNING and stamping
--      claim_token with its own random UUID.
--   2. Terminal writes (COMPLETED / FAILED) are guarded on
--      `status = 'RUNNING' AND claim_token = <the execution's token>`, so a
--      worker that lost ownership can never overwrite the row (fencing).
--   3. The scheduled recovery task rotates the token when it re-queues a stale
--      RUNNING row, which lets Trigger.dev idempotency keys distinguish
--      recovery generations.
--
-- `IF NOT EXISTS` guards are used defensively: the local migration history does
-- not match the remote history exactly (see the previous migration in this
-- directory for that reconciliation), so a plain ALTER could collide with an
-- unknown remote state. This migration is forwards-only and intentionally does
-- not repair or rewrite any historical migration.
-- ============================================================================

alter table public.website_audits
  add column if not exists claim_token uuid;