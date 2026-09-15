"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function TableShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full min-w-[42rem] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({
  className,
  align = "left",
  sortable,
  sorted,
  onSort,
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "right" | "center";
  sortable?: boolean;
  sorted?: "asc" | "desc" | false;
  onSort?: () => void;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "sticky top-0 z-10 border-b border-line bg-surface-muted px-4 py-2.5 text-[12px] font-semibold text-ink-muted",
        align === "right" && "text-right",
        align === "center" && "text-center",
        align === "left" && "text-left",
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            "inline-flex items-center gap-1 rounded hover:text-ink",
            align === "right" && "flex-row-reverse",
          )}
        >
          {children}
          {sorted === "asc" ? (
            <ArrowUp className="size-3" />
          ) : sorted === "desc" ? (
            <ArrowDown className="size-3" />
          ) : (
            <ArrowUp className="size-3 opacity-25" />
          )}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function Td({
  className,
  align = "left",
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <td
      className={cn(
        "border-b border-line px-4 py-3 align-middle text-ink-soft",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    />
  );
}

export function Tr({
  className,
  clickable,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { clickable?: boolean }) {
  return (
    <tr
      className={cn(
        "transition-colors last:[&>td]:border-b-0",
        clickable && "cursor-pointer hover:bg-surface-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Pagination({
  page,
  pageCount,
  total,
  onPageChange,
  label = "rows",
}: {
  page: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
  label?: string;
}) {
  if (pageCount <= 1) {
    return (
      <div className="px-4 py-3 text-[12px] text-ink-muted">
        {total} {label}
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <p className="text-[12px] text-ink-muted">
        Page {page} of {pageCount} · {total} {label}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          size="iconSm"
          variant="secondary"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>
        <Button
          size="iconSm"
          variant="secondary"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
