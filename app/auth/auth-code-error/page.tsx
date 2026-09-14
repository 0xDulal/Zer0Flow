import { CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/app/(auth)/_components/brand-mark";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Authentication error · Zer0Flow",
};

export default function AuthCodeErrorPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-8 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-semibold tracking-tight"
        >
          <BrandMark className="bg-foreground text-background" />
          Zer0Flow
        </Link>

        <div className="space-y-4">
          <div className="mx-auto grid size-11 place-items-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive">
            <CircleAlert className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              Authentication couldn&apos;t be completed.
            </h1>
            <p className="text-sm text-muted-foreground">
              Something went wrong while signing you in. Your account is safe —
              please try again.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full">
            <Link href="/login">Try again</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/login">Back to login</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
