import { cn } from "@/lib/utils";

/**
 * Zer0Flow logomark: a rounded tile with a centred ring ("target").
 * Colours come from the caller so it adapts to any surface / theme.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-[0.6rem]",
        className,
      )}
    >
      <span className="block size-3 rounded-full border-[2.5px] border-current" />
    </span>
  );
}
