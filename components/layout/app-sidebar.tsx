import { SidebarContent } from "./sidebar-content";

export function AppSidebar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  return (
    <aside className="sticky top-0 hidden h-svh w-64 shrink-0 border-r border-sidebar-border lg:flex lg:flex-col">
      <SidebarContent name={name} avatarUrl={avatarUrl} />
    </aside>
  );
}
