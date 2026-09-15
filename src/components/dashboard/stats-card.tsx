"use client";

import Link from "next/link";
import { ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTone = "default" | "amber" | "danger" | "success";

const toneRing: Record<StatTone, string> = {
  default: "bg-surface-muted text-ink-soft",
  amber: "bg-amber-soft text-amber",
  danger: "bg-danger-soft text-danger",
  success: "bg-success-soft text-success",
};

export function StatsCard({
  icon: Icon,
  label,
  value,
  support,
  trend,
  tone = "default",
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  support?: string;
  trend?: { direction: "up" | "down"; value: string };
  tone?: StatTone;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={cn("flex size-9 items-center justify-center rounded-lg", toneRing[tone])}>
          <Icon className="size-4.5" />
        </span>
        {href ? (
          <ArrowUpRight className="size-4 text-ink-muted opacity-0 transition-opacity group-hover:opacity-100" />
        ) : null}
      </div>
      <p className="mt-3 text-[13px] font-medium text-ink-muted">{label}</p>
      <p className="tabular mt-1 text-[26px] font-semibold leading-none tracking-tight text-ink">
        {value}
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[12px] font-medium",
              trend.direction === "up" ? "text-success" : "text-danger",
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
            {trend.value}
          </span>
        ) : null}
        {support ? <span className="text-[12px] text-ink-muted">{support}</span> : null}
      </div>
    </>
  );

  const className =
    "group block rounded-card border border-line bg-surface p-4 shadow-[0_1px_2px_rgb(16_24_40/0.04)] transition-colors hover:border-line-strong";

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
