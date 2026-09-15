"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Material } from "@/types";
import { useAppStore } from "@/store/app-store";
import { calculateRemainingQuantity, effectiveStatus } from "@/lib/calculations";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "@/lib/formatters";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

export function MaterialDetailsDialog({
  material,
  onClose,
  onEdit,
}: {
  material?: Material;
  onClose: () => void;
  onEdit: (material: Material) => void;
}) {
  const { rentalsForMaterial, rateChangesForMaterial, customerById } = useAppStore();

  if (!material) return null;

  const rentals = rentalsForMaterial(material.id)
    .filter((rental) => rental.status !== "cancelled")
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate))
    .slice(0, 8);
  const rateChanges = rateChangesForMaterial(material.id);
  const rented = material.totalUnits - material.availableUnits;
  const utilisation = material.totalStock
    ? Math.round((rented / material.totalStock) * 100)
    : 0;

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={material?.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" onClick={() => onEdit(material)}>
            Edit material
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Current rate" value={`${formatCurrency(material.dailyRentalRate)}/day`} />
          <Metric label="Total stock" value={formatNumber(material.totalUnits)} />
          <Metric label="Available" value={formatNumber(material.availableUnits)} />
          {/* <Metric label="Out on rent" value={formatNumber(rented)} tone={rented ? "amber" : undefined} /> */}
        </div>

        <div>
          <div className="flex items-center justify-between text-[12px] text-ink-muted">
            <span>Utilisation</span>
            <span className="tabular">{utilisation}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-brand" style={{ width: `${utilisation}%` }} />
          </div>
        </div>

        {material.description ? (
          <p className="rounded-md bg-surface-muted p-3 text-[13px] leading-relaxed text-ink-soft">
            {material.description}
          </p>
        ) : null}

        <section>
          <h3 className="text-[13px] font-semibold text-ink">Rate changes</h3>
          {rateChanges.length === 0 ? (
            <p className="mt-2 text-[13px] text-ink-muted">
              The rate has not changed since this material was added.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-line rounded-md border border-line">
              {rateChanges.map((change) => (
                <li key={change.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-[13px]">
                    <span className="tabular text-ink-muted line-through">
                      {formatCurrency(change.previousRate)}
                    </span>
                    <ArrowRight className="size-3.5 text-ink-muted" />
                    <span className="tabular font-medium text-ink">
                      {formatCurrency(change.newRate)}
                    </span>
                  </span>
                  <span className="text-[12px] text-ink-muted">
                    {formatDateTime(change.changedAt)} · {change.changedBy}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

      </div>
    </Dialog>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "amber" }) {
  return (
    <div className="rounded-md border border-line p-3">
      <p className="text-[12px] text-ink-muted">{label}</p>
      <p
        className={`tabular mt-1 text-[16px] font-semibold ${
          tone === "amber" ? "text-amber" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
