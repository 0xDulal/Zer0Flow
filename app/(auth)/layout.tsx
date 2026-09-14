import Link from "next/link";
import type { ReactNode } from "react";

import { AuthBrandPanel } from "./_components/auth-brand-panel";
import { BrandMark } from "./_components/brand-mark";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[1.02fr_1fr]">
      <AuthBrandPanel />

      <div className="flex min-w-0 flex-col">
        <div className="flex items-center px-6 py-6 lg:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-semibold tracking-tight"
          >
            <BrandMark className="bg-foreground text-background" />
            Zer0Flow
          </Link>
        </div>

        <main className="flex flex-1 items-center justify-center px-5 pb-14 sm:px-8 lg:py-14">
          <div className="w-full max-w-[22rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
