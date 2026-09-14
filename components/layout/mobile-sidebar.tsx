"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { useState } from "react";

import { BrandMark } from "@/app/(auth)/_components/brand-mark";
import { Button } from "@/components/ui/button";

import { SidebarContent } from "./sidebar-content";

export function MobileSidebar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur lg:hidden">
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <Button variant="ghost" size="icon" aria-label="Open navigation">
            <Menu aria-hidden="true" />
          </Button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-64 border-r border-sidebar-border bg-sidebar">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Dialog.Description className="sr-only">
              Zer0Flow navigation
            </Dialog.Description>

            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                className="absolute top-3 right-2"
              >
                <X aria-hidden="true" />
              </Button>
            </Dialog.Close>

            <SidebarContent
              name={name}
              avatarUrl={avatarUrl}
              onNavigate={() => setOpen(false)}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Link
        href="/dashboard"
        className="flex items-center gap-2 font-semibold tracking-tight"
      >
        <BrandMark className="bg-foreground text-background" />
        Zer0Flow
      </Link>
    </header>
  );
}
