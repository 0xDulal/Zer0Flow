import { formatDateTime } from "./format";

export type DueState = "unscheduled" | "overdue" | "today" | "upcoming";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Start of the given day in the server's local timezone. Zer0Flow currently
 * uses a single server-local convention for "today"/"overdue" (no per-user
 * timezone) — keep all due calculations going through these helpers.
 */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Due state relative to precomputed day boundaries. Used by list queries that
 * evaluate many leads against one "now".
 */
export function dueStateFor(
  dueAt: Date,
  startOfToday: Date,
  startOfTomorrow: Date,
): Exclude<DueState, "unscheduled"> {
  if (dueAt < startOfToday) {
    return "overdue";
  }

  if (dueAt < startOfTomorrow) {
    return "today";
  }

  return "upcoming";
}

/**
 * Due state for a single `next_action_at` value, evaluated against `now`.
 */
export function getDueState(
  nextActionAt: string | null,
  now: Date = new Date(),
): DueState {
  if (!nextActionAt) {
    return "unscheduled";
  }

  const dueAt = new Date(nextActionAt);

  if (Number.isNaN(dueAt.getTime())) {
    return "unscheduled";
  }

  const startOfToday = startOfDay(now);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  return dueStateFor(dueAt, startOfToday, startOfTomorrow);
}

/**
 * Human-friendly due label: "2 days overdue", "Today · 4:00 PM",
 * "Tomorrow · 10:30 AM", an absolute date/time further out, or "Unscheduled".
 */
export function formatRelativeDue(
  nextActionAt: string | null,
  now: Date = new Date(),
): string {
  if (!nextActionAt) {
    return "Unscheduled";
  }

  const dueAt = new Date(nextActionAt);

  if (Number.isNaN(dueAt.getTime())) {
    return "Unscheduled";
  }

  const startOfToday = startOfDay(now);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfDayAfterTomorrow = new Date(startOfTomorrow);
  startOfDayAfterTomorrow.setDate(startOfDayAfterTomorrow.getDate() + 1);

  if (dueAt < startOfToday) {
    const days = Math.max(
      1,
      Math.floor(
        (startOfToday.getTime() - startOfDay(dueAt).getTime()) / DAY_MS,
      ),
    );

    return days === 1 ? "1 day overdue" : `${days} days overdue`;
  }

  const time = new Intl.DateTimeFormat("en-US", {
    timeStyle: "short",
  }).format(dueAt);

  if (dueAt < startOfTomorrow) {
    return `Today · ${time}`;
  }

  if (dueAt < startOfDayAfterTomorrow) {
    return `Tomorrow · ${time}`;
  }

  return formatDateTime(nextActionAt);
}
