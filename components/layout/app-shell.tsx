import type { ReactNode } from "react";

import { AppSidebar } from "./app-sidebar";
import { MobileSidebar } from "./mobile-sidebar";

type AppShellProps = {
  name: string;
  avatarUrl: string | null;
  children: ReactNode;
};

export function AppShell({ name, avatarUrl, children }: AppShellProps) {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      <AppSidebar name={name} avatarUrl={avatarUrl} />
      <MobileSidebar name={name} avatarUrl={avatarUrl} />

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
