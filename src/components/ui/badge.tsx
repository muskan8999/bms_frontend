import * as React from "react";
import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-surface-muted text-ink-soft border-line",
  brand: "bg-brand-soft text-brand-ink border-brand/20",
  amber: "bg-amber-soft text-amber border-amber/25",
  danger: "bg-danger-soft text-danger border-danger/25",
  success: "bg-success-soft text-success border-success/25",
  info: "bg-info-soft text-info border-info/25",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[12px] font-medium leading-5",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
