import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { Button } from "@/components/ui/button";
import { loadPipeline } from "@/lib/pipeline/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Pipeline · Zer0Flow",
};

export default async function PipelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await loadPipeline(supabase);

  if (error || !data) {
    console.error("Failed to load pipeline:", error);

    return (
      <main className="w-full flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          We couldn&apos;t load your pipeline right now. Please refresh the page
          and try again.
        </div>
      </main>
    );
  }

  return (
    <main className="w-full flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Move opportunities forward and keep your sales process clear.
          </p>
        </div>

        <Button asChild>
          <Link href="/dashboard/leads/new">
            <Plus aria-hidden="true" />
            Add lead
          </Link>
        </Button>
      </div>

      <PipelineBoard data={data} />
    </main>
  );
}
