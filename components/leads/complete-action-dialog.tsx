"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useId, useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { completeLeadNextAction } from "@/lib/leads/actions";

type CompleteActionDialogProps = {
  leadId: string;
  currentNextAction: string;
};

export function CompleteActionDialog({
  leadId,
  currentNextAction,
}: CompleteActionDialogProps) {
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
    const outcome = String(formData.get("outcome") ?? "");
    const nextAction = String(formData.get("next_action") ?? "");
    const nextActionAt = String(formData.get("next_action_at") ?? "");

    setError(null);

    startTransition(async () => {
      const result = await completeLeadNextAction({
        leadId,
        outcome,
        nextAction,
        nextActionAt: nextActionAt || null,
      });

      if (!result.ok) {
        setError(result.error);

        // The activity was written even though the lead update failed — surface
        // it in the timeline behind the dialog.
        if (result.recorded) {
          router.refresh();
        }

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
        <Button size="sm">Complete</Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border bg-background p-5 shadow-lg">
          <Dialog.Title className="text-base font-semibold tracking-tight">
            Complete follow-up
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-muted-foreground">
            Record what happened, then optionally plan the next step.
          </Dialog.Description>

          <div className="mt-4 rounded-md border bg-muted/40 px-3 py-2">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Current action
            </p>
            <p className="mt-0.5 text-sm">{currentNextAction}</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-outcome`}>What happened?</Label>
              <Textarea
                id={`${fieldId}-outcome`}
                name="outcome"
                rows={2}
                defaultValue={currentNextAction}
                maxLength={1000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-action`}>
                Next action (optional)
              </Label>
              <Input
                id={`${fieldId}-action`}
                name="next_action"
                maxLength={500}
                placeholder="Send audit Loom"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-at`}>Due (optional)</Label>
              <Input
                id={`${fieldId}-at`}
                name="next_action_at"
                type="datetime-local"
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
                    Completing…
                  </>
                ) : (
                  "Complete follow-up"
                )}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
