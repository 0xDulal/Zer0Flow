import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signOut } from "@/lib/auth/actions";
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

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to Zer0Flow
          </h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user.email}
          </p>
        </div>

        <form action={signOut}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Authentication is working</CardTitle>
          <CardDescription>
            This page is protected and only visible to signed-in users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-sm text-muted-foreground">Account</p>
          <p className="text-sm">{user.email}</p>
          {workspaceError ? (
            <p className="pt-2 text-sm text-destructive">
              Workspace setup incomplete: {workspaceError}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
