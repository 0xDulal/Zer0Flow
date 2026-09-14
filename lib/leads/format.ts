import type { Database } from "@/lib/supabase/database.types";
import { Constants } from "@/lib/supabase/database.types";

export type LeadSource = Database["public"]["Enums"]["lead_source"];
export type PipelineStage = Database["public"]["Enums"]["pipeline_stage"];
export type LeadStatus = Database["public"]["Enums"]["lead_status"];
export type LeadTemperature = Database["public"]["Enums"]["lead_temperature"];

export type SelectOption<T extends string> = {
  value: T;
  label: string;
};

export function labelize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toOptions<T extends string>(values: readonly T[]): SelectOption<T>[] {
  return values.map((value) => ({ value, label: labelize(value) }));
}

export const leadSourceOptions = toOptions(Constants.public.Enums.lead_source);
export const pipelineStageOptions = toOptions(
  Constants.public.Enums.pipeline_stage,
);
export const leadStatusOptions = toOptions(Constants.public.Enums.lead_status);
export const leadTemperatureOptions = toOptions(
  Constants.public.Enums.lead_temperature,
);

export const leadStatusFilters = [
  "ALL",
  "ACTIVE",
  "WON",
  "LOST",
  "NURTURE",
] as const;

export type LeadStatusFilter = (typeof leadStatusFilters)[number];

export function isLeadStatusFilter(value: string): value is LeadStatusFilter {
  return (leadStatusFilters as readonly string[]).includes(value);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatDate(value: string | null): string {
  if (!value) {
    return "—";
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(year, month - 1, day),
  );
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatScore(value: number | null): string {
  return value === null ? "—" : String(value);
}

export function toExternalUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Uncontrolled form defaults. `next_action_at` is already converted to a
 * local `datetime-local` string on the server so that the client render is
 * deterministic (no timezone-dependent hydration mismatch).
 */
export type LeadFormDefaults = {
  full_name: string;
  company_name: string;
  website: string;
  linkedin_url: string;
  email: string;
  phone: string;
  niche: string;
  location: string;
  source: LeadSource;
  stage: PipelineStage;
  status: LeadStatus;
  temperature: LeadTemperature;
  deal_value: string;
  probability: string;
  expected_close_date: string;
  next_action: string;
  next_action_at: string;
  notes: string;
};
