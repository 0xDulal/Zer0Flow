import { CircleAlert, CircleCheck } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AuthMessageProps = {
  variant: "success" | "error";
  title?: string;
  children: ReactNode;
};

export function AuthMessage({ variant, title, children }: AuthMessageProps) {
  const isSuccess = variant === "success";

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      aria-live={isSuccess ? "polite" : "assertive"}
      className={cn(
        "flex gap-3 rounded-lg border px-3.5 py-3 text-sm",
        isSuccess
          ? "border-border bg-muted/60 text-foreground"
          : "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      <span className="mt-0.5 shrink-0">
        {isSuccess ? (
          <CircleCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <CircleAlert className="size-4" />
        )}
      </span>
      <div className="min-w-0 space-y-0.5">
        {title ? <p className="font-medium leading-tight">{title}</p> : null}
        <div
          className={cn(
            "leading-snug",
            isSuccess ? "text-muted-foreground" : "text-destructive/90",
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
