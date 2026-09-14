import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, labelize } from "@/lib/leads/format";
import { getDueState, formatRelativeDue } from "@/lib/leads/due";
import type { LeadRow } from "@/lib/leads/queries";
import { cn } from "@/lib/utils";

import { CompleteActionDialog } from "./complete-action-dialog";
import { SetNextActionDialog } from "./set-next-action-dialog";

const TERMINAL_STATUSES = new Set<LeadRow["status"]>([
  "WON",
  "LOST",
  "NURTURE",
]);

export function LeadNextAction({ lead }: { lead: LeadRow }) {
  const nextAction = lead.next_action?.trim() ?? "";
  const dueState = getDueState(lead.next_action_at);
  const isTerminal = TERMINAL_STATUSES.has(lead.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next action</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {nextAction ? (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={cn(
                  "text-sm font-medium",
                  isTerminal && "text-muted-foreground",
                )}
              >
                {nextAction}
              </p>
              {dueState === "overdue" ? (
                <Badge variant="destructive">Overdue</Badge>
              ) : null}
              {isTerminal ? (
                <Badge variant="muted">{labelize(lead.status)}</Badge>
              ) : null}
            </div>

            <p className="text-sm text-muted-foreground">
              {formatRelativeDue(lead.next_action_at)}
              {lead.next_action_at ? (
                <span> · {formatDateTime(lead.next_action_at)}</span>
              ) : null}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No next action scheduled
          </p>
        )}

        {isTerminal ? (
          <p className="text-xs text-muted-foreground">
            Reopen the lead to schedule follow-ups.
          </p>
        ) : nextAction ? (
          <div className="flex flex-wrap gap-2">
            <CompleteActionDialog
              leadId={lead.id}
              currentNextAction={nextAction}
            />
            <SetNextActionDialog
              leadId={lead.id}
              currentNextAction={nextAction}
              currentNextActionAt={lead.next_action_at}
              label="Edit"
              variant="outline"
            />
          </div>
        ) : (
          <SetNextActionDialog
            leadId={lead.id}
            currentNextAction=""
            currentNextActionAt={null}
            label="Set next action"
          />
        )}
      </CardContent>
    </Card>
  );
}
