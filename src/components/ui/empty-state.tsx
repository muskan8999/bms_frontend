import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  message,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  message?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      {Icon ? (
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-surface-muted">
          <Icon className="size-5 text-ink-muted" />
        </div>
      ) : null}
      <p className="text-[15px] font-semibold text-ink">{title}</p>
      {message ? (
        <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-muted">{message}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
