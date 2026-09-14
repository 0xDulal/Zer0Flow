import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, labelize } from "@/lib/leads/format";
import type { ActivityRow } from "@/lib/leads/queries";
import type { Json } from "@/lib/supabase/database.types";

function stageChangeFrom(
  activity: ActivityRow,
): { from: string; to: string } | null {
  if (activity.type !== "NOTE" || activity.title !== "Stage changed") {
    return null;
  }

  const metadata = activity.metadata;

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const record = metadata as Record<string, Json | undefined>;
  const from = record.from;
  const to = record.to;

  if (typeof from === "string" && typeof to === "string") {
    return { from, to };
  }

  return null;
}

type ActivityTimelineProps = {
  activities: ActivityRow[];
  error?: string;
};

export function ActivityTimeline({
  activities,
  error,
}: ActivityTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-destructive">
            Could not load activity: {error}
          </p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ol className="space-y-4">
            {activities.map((activity) => {
              const stageChange = stageChangeFrom(activity);

              return (
                <li key={activity.id} className="flex gap-3">
                  <span
                    className="mt-1.5 size-2 shrink-0 rounded-full bg-border"
                    aria-hidden="true"
                  />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {activity.title}
                      </span>
                      <Badge variant="muted">
                        {labelize(activity.type)}
                      </Badge>
                    </div>

                    {stageChange ? (
                      <p className="text-sm text-muted-foreground">
                        {labelize(stageChange.from)} → {labelize(stageChange.to)}
                      </p>
                    ) : activity.description ? (
                      <p className="text-sm text-muted-foreground">
                        {activity.description}
                      </p>
                    ) : null}

                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(activity.occurred_at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
