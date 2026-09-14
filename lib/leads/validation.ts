import { Constants } from "@/lib/supabase/database.types";

import type {
  LeadSource,
  LeadStatus,
  LeadTemperature,
  PipelineStage,
} from "./format";

export type LeadValues = {
  full_name: string;
  company_name: string | null;
  website: string | null;
  linkedin_url: string | null;
  email: string | null;
  phone: string | null;
  niche: string | null;
  location: string | null;
  source: LeadSource;
  stage: PipelineStage;
  status: LeadStatus;
  temperature: LeadTemperature;
  deal_value: number;
  probability: number;
  expected_close_date: string | null;
  next_action: string | null;
  next_action_at: string | null;
  notes: string | null;
};

export type ParseLeadResult = { error: string } | { values: LeadValues };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function nullable(value: string): string | null {
  return value.length > 0 ? value : null;
}

function parseEnum<T extends string>(
  raw: string,
  allowed: readonly T[],
  fallback: T,
): T | null {
  if (!raw) {
    return fallback;
  }

  return (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

/**
 * Parses and validates lead form input server-side. Enum values are checked
 * against the database enums; `workspace_id` is never read from the form.
 */
export function parseLeadForm(formData: FormData): ParseLeadResult {
  const fullName = text(formData, "full_name");

  if (!fullName) {
    return { error: "Full name is required." };
  }

  if (fullName.length > 200) {
    return { error: "Full name must be 200 characters or fewer." };
  }

  const email = text(formData, "email");

  if (email && !EMAIL_PATTERN.test(email)) {
    return { error: "Enter a valid email address." };
  }

  const source = parseEnum(
    text(formData, "source"),
    Constants.public.Enums.lead_source,
    "OTHER",
  );

  if (!source) {
    return { error: "Select a valid lead source." };
  }

  const stage = parseEnum(
    text(formData, "stage"),
    Constants.public.Enums.pipeline_stage,
    "PROSPECT",
  );

  if (!stage) {
    return { error: "Select a valid pipeline stage." };
  }

  const status = parseEnum(
    text(formData, "status"),
    Constants.public.Enums.lead_status,
    "ACTIVE",
  );

  if (!status) {
    return { error: "Select a valid lead status." };
  }

  const temperature = parseEnum(
    text(formData, "temperature"),
    Constants.public.Enums.lead_temperature,
    "COLD",
  );

  if (!temperature) {
    return { error: "Select a valid temperature." };
  }

  const dealValueRaw = text(formData, "deal_value");
  let dealValue = 0;

  if (dealValueRaw) {
    const parsed = Number(dealValueRaw);

    if (!Number.isFinite(parsed) || parsed < 0) {
      return { error: "Deal value must be a positive number." };
    }

    dealValue = parsed;
  }

  const probabilityRaw = text(formData, "probability");
  let probability = 0;

  if (probabilityRaw) {
    const parsed = Number(probabilityRaw);

    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
      return { error: "Probability must be a whole number between 0 and 100." };
    }

    probability = parsed;
  }

  const expectedCloseDate = nullable(text(formData, "expected_close_date"));

  if (expectedCloseDate && !DATE_PATTERN.test(expectedCloseDate)) {
    return { error: "Expected close date must be a valid date." };
  }

  const nextActionAtRaw = text(formData, "next_action_at");
  let nextActionAt: string | null = null;

  if (nextActionAtRaw) {
    const date = new Date(nextActionAtRaw);

    if (Number.isNaN(date.getTime())) {
      return { error: "Next action date must be a valid date and time." };
    }

    nextActionAt = date.toISOString();
  }

  return {
    values: {
      full_name: fullName,
      company_name: nullable(text(formData, "company_name")),
      website: nullable(text(formData, "website")),
      linkedin_url: nullable(text(formData, "linkedin_url")),
      email: nullable(email),
      phone: nullable(text(formData, "phone")),
      niche: nullable(text(formData, "niche")),
      location: nullable(text(formData, "location")),
      source,
      stage,
      status,
      temperature,
      deal_value: dealValue,
      probability,
      expected_close_date: expectedCloseDate,
      next_action: nullable(text(formData, "next_action")),
      next_action_at: nextActionAt,
      notes: nullable(text(formData, "notes")),
    },
  };
}
