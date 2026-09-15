"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Tooltip({
  label,
  side = "right",
  children,
  className,
}: {
  label: string;
  side?: "right" | "top";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 hidden whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[12px] font-medium text-canvas shadow-md group-hover/tt:block group-focus-within/tt:block",
          side === "right" ? "left-full top-1/2 ml-2 -translate-y-1/2" : "bottom-full left-1/2 mb-2 -translate-x-1/2",
        )}
      >
        {label}
      </span>
    </span>
  );
}
