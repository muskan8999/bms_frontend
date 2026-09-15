"use client";

import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type MenuAction = {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
  separatorBefore?: boolean;
};

export function RowMenu({ actions, label = "Actions" }: { actions: MenuAction[]; label?: string }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onAway = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onAway);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onAway);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className="inline-flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
      >
        <MoreHorizontal className="size-4" />
      </button>

      {open ? (
        <div
          role="menu"
          onClick={(event) => event.stopPropagation()}
          className="animate-pop absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-xl"
        >
          {actions.map((action) => (
            <React.Fragment key={action.label}>
              {action.separatorBefore ? <div className="my-1 h-px bg-line" /> : null}
              <button
                role="menuitem"
                disabled={action.disabled}
                onClick={() => {
                  setOpen(false);
                  action.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] disabled:cursor-not-allowed disabled:opacity-40",
                  action.tone === "danger"
                    ? "text-danger hover:bg-danger-soft"
                    : "text-ink-soft hover:bg-surface-muted hover:text-ink",
                )}
              >
                {action.icon ? <action.icon className="size-4" /> : null}
                {action.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      ) : null}
    </div>
  );
}
