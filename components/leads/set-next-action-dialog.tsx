"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useId, useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setLeadNextAction } from "@/lib/leads/actions";
import { toDateTimeLocalValue } from "@/lib/leads/format";

type SetNextActionDialogProps = {
  leadId: string;
  currentNextAction: string;
  currentNextActionAt: string | null;
  label?: string;
  variant?: "default" | "outline";
};

export function SetNextActionDialog({
  leadId,
  currentNextAction,
  currentNextActionAt,
  label = "Set next action",
  variant = "default",
}: SetNextActionDialogProps) {
  const router = useRouter();
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const nextAction = String(formData.get("next_action") ?? "");
    const nextActionAt = String(formData.get("next_action_at") ?? "");

    setError(null);

    startTransition(async () => {
      const result = await setLeadNextAction({
        leadId,
        nextAction,
        nextActionAt: nextActionAt || null,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!isPending) {
          setOpen(next);
        }
      }}
    >
      <Dialog.Trigger asChild>
        <Button variant={variant} size="sm">
          {label}
        </Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-5 shadow-lg">
          <Dialog.Title className="text-base font-semibold tracking-tight">
            Next action
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Plan the next step and when it is due.
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-action`}>Next action</Label>
              <Input
                id={`${fieldId}-action`}
                name="next_action"
                defaultValue={currentNextAction}
                maxLength={500}
                placeholder="Follow up about the website audit"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-at`}>Due</Label>
              <Input
                id={`${fieldId}-at`}
                name="next_action_at"
                type="datetime-local"
                defaultValue={
                  currentNextActionAt
                    ? toDateTimeLocalValue(currentNextActionAt)
                    : ""
                }
              />
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                >
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
