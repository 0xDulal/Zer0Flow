"use client";

import { LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/app/(auth)/_components/brand-mark";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { getInitials } from "@/lib/auth/display-name";
import { cn } from "@/lib/utils";

import { MAIN_NAV, isNavItemActive } from "./nav-items";

type SidebarContentProps = {
  name: string;
  avatarUrl: string | null;
  onNavigate?: () => void;
};

export function SidebarContent({
  name,
  avatarUrl,
  onNavigate,
}: SidebarContentProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 shrink-0 items-center px-4">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2 font-semibold tracking-tight"
        >
          <BrandMark className="bg-foreground text-background" />
          Zer0Flow
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        <p className="px-2.5 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Main
        </p>
        <nav aria-label="Main">
          <ul className="space-y-0.5">
            {MAIN_NAV.map((item) => {
              const active = isNavItemActive(item, pathname);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      active
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                    {active ? (
                      <span
                        className="ml-auto size-1.5 shrink-0 rounded-full bg-current"
                        aria-hidden="true"
                      />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-1.5">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={32}
              height={32}
              className="size-8 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
            >
              {getInitials(name)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">Account</p>
          </div>
        </div>

        <form action={signOut} className="mt-1">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
