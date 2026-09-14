import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics";
import { EmptyDashboard } from "@/components/dashboard/empty-dashboard";
import { HotOpportunities } from "@/components/dashboard/hot-opportunities";
import { PipelineOverview } from "@/components/dashboard/pipeline-overview";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { TodaysActions } from "@/components/dashboard/todays-actions";
import { UpcomingActions } from "@/components/dashboard/upcoming-actions";
import { getDisplayName } from "@/lib/auth/display-name";
import { loadDashboard } from "@/lib/dashboard/queries";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/workspace";

export const metadata: Metadata = {
  title: "Dashboard · Zer0Flow",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error: workspaceError } = await ensureWorkspace(
    supabase,
    user.email ?? undefined,
  );

  const { data, error } = await loadDashboard(supabase);

  if (error || !data) {
    console.error("Failed to load dashboard data:", error);

    return (
      <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          We couldn&apos;t load your dashboard right now. Please refresh the
          page and try again.
        </div>
      </main>
    );
  }

  if (!data.hasLeads) {
    return (
      <main className="w-full flex-1 px-4 py-12 sm:px-6 lg:px-8">
        {workspaceError ? (
          <div
            role="alert"
            className="mb-8 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            Workspace setup incomplete: {workspaceError}
          </div>
        ) : null}
        <EmptyDashboard />
      </main>
    );
  }

  return (
    <main className="w-full flex-1 space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      {workspaceError ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          Workspace setup incomplete: {workspaceError}
        </div>
      ) : null}

      <DashboardHeader name={getDisplayName(user)} />

      <div className="grid gap-8 xl:grid-cols-5">
        <div className="xl:col-span-3">
          <TodaysActions actions={data.todaysActions} />
        </div>

        <div className="space-y-8 xl:col-span-2">
          <DashboardMetrics metrics={data.metrics} />
          <PipelineOverview pipeline={data.pipeline} />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <HotOpportunities leads={data.hotOpportunities} />
        <RecentActivity items={data.recentActivity} />
        <UpcomingActions actions={data.upcomingActions} />
      </div>
    </main>
  );
}
