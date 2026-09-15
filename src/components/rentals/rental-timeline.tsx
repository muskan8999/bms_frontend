"use client";

import {
  CircleCheck,
  CircleDot,
  FileText,
  PackageCheck,
  PackagePlus,
  Truck,
  Wallet,
  XCircle,
} from "lucide-react";
import type { Invoice, Rental, ReturnRecord, TimelineEvent } from "@/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

const iconFor = {
  created: PackagePlus,
  issued: Truck,
  "partial-return": PackageCheck,
  "final-return": CircleCheck,
  invoice: FileText,
  payment: Wallet,
  cancelled: XCircle,
} as const;

export function buildTimeline(
  rental: Rental,
  returns: ReturnRecord[],
  invoice?: Invoice,
): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      id: "created",
      type: "created",
      title: "Rental created",
      description: `${rental.items.length} material ${rental.items.length === 1 ? "type" : "types"} recorded`,
      date: rental.createdAt,
    },
  ];

  if (rental.status !== "draft") {
    events.push({
      id: "issued",
      type: "issued",
      title: "Material issued",
      description: rental.items
        .map((item) => `${item.quantity} × ${item.materialName}`)
        .join(", "),
      date: rental.issueDate,
    });
  }

  // Group returns recorded on the same day into one entry.
  const grouped = new Map<string, ReturnRecord[]>();
  returns.forEach((record) => {
    grouped.set(record.returnDate, [...(grouped.get(record.returnDate) ?? []), record]);
  });

  [...grouped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([date, records], index) => {
      const isFinal = rental.actualReturnDate === date;
      events.push({
        id: `return-${date}-${index}`,
        type: isFinal ? "final-return" : "partial-return",
        title: isFinal ? "Final return" : "Partial return",
        description: records
          .map((record) => `${record.quantity} × ${record.materialName}`)
          .join(", "),
        date,
      });
    });

  if (invoice) {
    events.push({
      id: "invoice",
      type: "invoice",
      title: `Bill ${invoice.id} raised`,
      description: `${formatCurrency(invoice.totalAmount)} for ${invoice.totalDays} days`,
      date: invoice.createdAt,
    });
    if (invoice.paidAmount > 0) {
      events.push({
        id: "payment",
        type: "payment",
        title: invoice.status === "paid" ? "Paid in full" : "Part payment recorded",
        description: `${formatCurrency(invoice.paidAmount)} of ${formatCurrency(invoice.totalAmount)} received`,
        date: invoice.createdAt,
      });
    }
  }

  if (rental.status === "cancelled") {
    events.push({
      id: "cancelled",
      type: "cancelled",
      title: "Rental cancelled",
      description: "Stock returned to the yard, no bill raised",
      date: rental.createdAt,
    });
  }

  return events;
}

export function RentalTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol className="relative space-y-5 pl-7">
      <span className="absolute left-[11px] top-2 bottom-2 w-px bg-line" aria-hidden />
      {events.map((event, index) => {
        const Icon = iconFor[event.type] ?? CircleDot;
        const isLast = index === events.length - 1;
        return (
          <li key={event.id} className="relative">
            <span
              className={cn(
                "absolute -left-7 top-0 flex size-6 items-center justify-center rounded-full border",
                isLast
                  ? "border-brand bg-brand text-white"
                  : "border-line bg-surface text-ink-muted",
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <p className="text-[13.5px] font-medium text-ink">{event.title}</p>
            {event.description ? (
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">
                {event.description}
              </p>
            ) : null}
            <p className="tabular mt-1 text-[12px] text-ink-muted">
              {event.date.includes("T") ? formatDateTime(event.date) : formatDate(event.date)}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
