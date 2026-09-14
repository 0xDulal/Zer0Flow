import { Kanban, LayoutDashboard, Users } from "lucide-react";
import type { ComponentType } from "react";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** When true, only an exact pathname match is considered active. */
  exact?: boolean;
};

/**
 * Only real, existing routes belong here. As Pipeline / Activities / Settings
 * are built, add them to the appropriate section — the sidebar renders from
 * this list.
 */
export const MAIN_NAV: readonly NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/dashboard/leads",
    label: "Leads",
    icon: Users,
  },
  {
    href: "/dashboard/pipeline",
    label: "Pipeline",
    icon: Kanban,
  },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
