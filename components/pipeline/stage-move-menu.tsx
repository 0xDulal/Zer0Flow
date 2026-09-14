"use client";

import { Check, ChevronDown, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { labelize, type PipelineStage } from "@/lib/leads/format";
import { PIPELINE_STAGES } from "@/lib/leads/pipeline";
import { updateLeadStage } from "@/lib/pipeline/actions";

type StageMoveMenuProps = {
  leadId: string;
  currentStage: PipelineStage;
};

export function StageMoveMenu({ leadId, currentStage }: StageMoveMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSelect(stage: PipelineStage) {
    if (stage === currentStage || isPending) {
      return;
    }

    setError(null);
    setOpen(false);

    startTransition(async () => {
      const result = await updateLeadStage(leadId, stage);

      if (!result.ok) {
        setError(result.error ?? "Could not move the lead.");
        return;
      }

      if (result.activityError) {
        setError(result.activityError);
      }

      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            aria-label="Move to stage"
            className="h-7 shrink-0 gap-1 px-2 text-xs text-muted-foreground"
          >
            {isPending ? (
              <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
            ) : null}
            Move to…
            <ChevronDown className="size-3" aria-hidden="true" />
          </Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={4}
            className="z-50 max-h-80 min-w-44 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          >
            <DropdownMenu.Label className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Move to
            </DropdownMenu.Label>

            {PIPELINE_STAGES.map((stage) => (
              <DropdownMenu.Item
                key={stage}
                onSelect={() => handleSelect(stage)}
                disabled={stage === currentStage}
                className="flex cursor-default items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
              >
                <span>{labelize(stage)}</span>
                {stage === currentStage ? (
                  <Check className="size-3.5" aria-hidden="true" />
                ) : null}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      {error ? (
        <p
          role="alert"
          className="max-w-40 text-right text-xs text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
