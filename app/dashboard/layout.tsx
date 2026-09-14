import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { getAvatarUrl, getDisplayName } from "@/lib/auth/display-name";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard · Zer0Flow",
};

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell
      name={getDisplayName(user, "Your account")}
      avatarUrl={getAvatarUrl(user)}
    >
      {children}
    </AppShell>
  );
}
