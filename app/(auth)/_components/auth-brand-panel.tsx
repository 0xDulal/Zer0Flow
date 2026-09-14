import { CalendarClock, Crosshair, Send } from "lucide-react";
import Link from "next/link";
import type { ComponentType } from "react";

import { BrandMark } from "./brand-mark";

type Benefit = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
};

const BENEFITS: Benefit[] = [
  {
    icon: Crosshair,
    title: "Prioritized by potential",
    description: "Focus on the leads most likely to become clients.",
  },
  {
    icon: CalendarClock,
    title: "Never miss a follow-up",
    description: "Every lead carries a clear next action and date.",
  },
  {
    icon: Send,
    title: "Outreach that fits",
    description: "Know what to say, and exactly when to say it.",
  },
];

export function AuthBrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:gap-12 lg:p-12 xl:p-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:34px_34px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -right-24 size-80 rounded-full bg-current opacity-[0.12] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-current opacity-[0.08] blur-3xl"
      />

      <Link
        href="/"
        className="relative inline-flex items-center gap-2.5 font-semibold tracking-tight"
      >
        <BrandMark className="bg-primary-foreground/10 text-primary-foreground ring-1 ring-primary-foreground/25" />
        Zer0Flow
      </Link>

      <div className="relative max-w-md space-y-10">
        <div className="space-y-4">
          <h2 className="text-3xl leading-[1.15] font-semibold tracking-tight xl:text-4xl">
            Your client acquisition, under control.
          </h2>
          <p className="text-sm leading-relaxed text-primary-foreground/70">
            Know who to contact. Know what to say. Know when to follow up. Know
            what to do next.
          </p>
        </div>

        <ul className="space-y-5">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <li key={benefit.title} className="flex gap-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
                  <Icon className="size-4" />
                </span>
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{benefit.title}</p>
                  <p className="text-sm text-primary-foreground/65">
                    {benefit.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="relative text-xs text-primary-foreground/55">
        Every lead. A clear next action.
      </p>
    </aside>
  );
}
