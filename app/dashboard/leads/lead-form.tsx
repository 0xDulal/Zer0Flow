"use client";

import { LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { LeadFormState } from "@/lib/leads/actions";
import {
  leadSourceOptions,
  leadStatusOptions,
  leadTemperatureOptions,
  pipelineStageOptions,
  type LeadFormDefaults,
} from "@/lib/leads/format";

type LeadFormProps = {
  action: (state: LeadFormState, formData: FormData) => Promise<LeadFormState>;
  submitLabel: string;
  cancelHref: string;
  leadId?: string;
  defaultValues?: LeadFormDefaults;
};

const initialState: LeadFormState = {};

export function LeadForm({
  action,
  submitLabel,
  cancelHref,
  leadId,
  defaultValues,
}: LeadFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-8">
      {leadId ? (
        <input type="hidden" name="lead_id" value={leadId} />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            name="full_name"
            required
            maxLength={200}
            placeholder="Jane Doe"
            defaultValue={defaultValues?.full_name ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company_name">Company name</Label>
          <Input
            id="company_name"
            name="company_name"
            placeholder="Acme Coaching"
            defaultValue={defaultValues?.company_name ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="jane@example.com"
            defaultValue={defaultValues?.email ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            placeholder="+1 555 000 0000"
            defaultValue={defaultValues?.phone ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            name="website"
            placeholder="https://example.com"
            defaultValue={defaultValues?.website ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="linkedin_url">LinkedIn URL</Label>
          <Input
            id="linkedin_url"
            name="linkedin_url"
            placeholder="https://linkedin.com/in/janedoe"
            defaultValue={defaultValues?.linkedin_url ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="niche">Niche</Label>
          <Input
            id="niche"
            name="niche"
            placeholder="Business coaching"
            defaultValue={defaultValues?.niche ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            placeholder="Austin, TX"
            defaultValue={defaultValues?.location ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="source">Source</Label>
          <Select
            id="source"
            name="source"
            defaultValue={defaultValues?.source ?? "OTHER"}
          >
            {leadSourceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stage">Stage</Label>
          <Select
            id="stage"
            name="stage"
            defaultValue={defaultValues?.stage ?? "PROSPECT"}
          >
            {pipelineStageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "ACTIVE"}
          >
            {leadStatusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="temperature">Temperature</Label>
          <Select
            id="temperature"
            name="temperature"
            defaultValue={defaultValues?.temperature ?? "COLD"}
          >
            {leadTemperatureOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="deal_value">Deal value (USD)</Label>
          <Input
            id="deal_value"
            name="deal_value"
            type="number"
            min={0}
            step="0.01"
            placeholder="0"
            defaultValue={defaultValues?.deal_value ?? "0"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="probability">Probability (%)</Label>
          <Input
            id="probability"
            name="probability"
            type="number"
            min={0}
            max={100}
            step={1}
            placeholder="0"
            defaultValue={defaultValues?.probability ?? "0"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expected_close_date">Expected close date</Label>
          <Input
            id="expected_close_date"
            name="expected_close_date"
            type="date"
            defaultValue={defaultValues?.expected_close_date ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="next_action_at">Next action date</Label>
          <Input
            id="next_action_at"
            name="next_action_at"
            type="datetime-local"
            defaultValue={defaultValues?.next_action_at ?? ""}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="next_action">Next action</Label>
          <Input
            id="next_action"
            name="next_action"
            placeholder="Send first message"
            defaultValue={defaultValues?.next_action ?? ""}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            name="notes"
            rows={4}
            placeholder="Context, research, or anything worth remembering."
            defaultValue={defaultValues?.notes ?? ""}
          />
        </div>
      </section>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <LoaderCircle className="animate-spin" />
              Saving…
            </>
          ) : (
            submitLabel
          )}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
