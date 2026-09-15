"use client";

import { formatNumber } from "@/lib/formatters";

export function PopularMaterials({
  data,
}: {
  data: { id: string; name: string; issued: number; outNow: number }[];
}) {
  const max = Math.max(...data.map((item) => item.issued), 1);

  return (
    <ul className="space-y-3.5">
      {data.map((item) => (
        <li key={item.id}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[13.5px] font-medium text-ink">{item.name}</span>
            <span className="tabular shrink-0 text-[13px] text-ink-soft">
              {formatNumber(item.issued)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${(item.issued / max) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-[12px] text-ink-muted">
            {item.outNow > 0 ? `${formatNumber(item.outNow)} out on rent now` : "All back in stock"}
          </p>
        </li>
      ))}
    </ul>
  );
}
