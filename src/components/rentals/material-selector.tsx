"use client";

import * as React from "react";
import { AlertTriangle, Boxes, Plus, Trash2 } from "lucide-react";
import type { Material } from "@/types";
import { useAppStore } from "@/store/app-store";
import { calculateDailyRent, validateRentalQuantity } from "@/lib/calculations";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { TableShell, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";

export type DraftItem = { materialId: string; quantity: number };

/**
 * Search a material, see its live stock and rate, set a quantity, press Enter.
 * The rate is never typed by hand — it comes from the material record.
 */
export function MaterialSelector({
  items,
  onAdd,
  excludeIds,
}: {
  items: DraftItem[];
  onAdd: (item: DraftItem) => void;
  excludeIds: string[];
}) {
  const { state } = useAppStore();
  const [materialId, setMaterialId] = React.useState<string>();
  const [quantity, setQuantity] = React.useState("");
  const [error, setError] = React.useState<string>();
  const quantityRef = React.useRef<HTMLInputElement>(null);

  const material = state.materials.find((entry) => entry.id === materialId);

  const options = React.useMemo(
    () =>
      state.materials
        .filter((entry) => entry.isActive)
        .map((entry) => ({
          value: entry.id,
          label: entry.name,
          hint: `${formatNumber(entry.availableStock)} available · ${formatCurrency(entry.dailyRate)} per ${entry.unit} per day`,
          keywords: `${entry.localName ?? ""} ${entry.category}`,
          disabled: entry.availableStock === 0 || excludeIds.includes(entry.id),
          right:
            entry.availableStock === 0 ? (
              <Badge tone="danger">Out of stock</Badge>
            ) : excludeIds.includes(entry.id) ? (
              <Badge tone="neutral">Added</Badge>
            ) : null,
        })),
    [state.materials, excludeIds],
  );

  const add = () => {
    if (!material) {
      setError("Pick a material first.");
      return;
    }
    const qty = Number(quantity);
    const check = validateRentalQuantity(qty, material);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    onAdd({ materialId: material.id, quantity: qty });
    setMaterialId(undefined);
    setQuantity("");
    setError(undefined);
  };

  const dailyForLine = material && Number(quantity) > 0
    ? calculateDailyRent(Number(quantity), material.dailyRate)
    : 0;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_7.5rem_auto] sm:items-end">
        <Field label="Material" required>
          <Combobox
            options={options}
            value={materialId}
            onChange={(value) => {
              setMaterialId(value);
              setError(undefined);
              window.setTimeout(() => quantityRef.current?.focus(), 20);
            }}
            placeholder="Search material"
            searchPlaceholder="Fatte, Ghodi, plate…"
            emptyMessage="No material matches that search."
          />
        </Field>

        <Field label="Quantity" required>
          <Input
            ref={quantityRef}
            type="number"
            min={1}
            inputMode="numeric"
            className="tabular"
            placeholder="0"
            value={quantity}
            onChange={(event) => {
              setQuantity(event.target.value);
              setError(undefined);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
          />
        </Field>

        <Button type="button" variant="secondary" onClick={add} className="h-9">
          <Plus />
          Add
        </Button>
      </div>

      {material ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-md bg-surface-muted px-3 py-2.5 text-[12.5px]">
          <span className="font-medium text-ink">{material.name}</span>
          {material.localName ? <span className="text-ink-muted">{material.localName}</span> : null}
          <span className="tabular text-ink-soft">
            {formatNumber(material.availableStock)} {material.unit}
            {material.availableStock === 1 ? "" : "s"} available
          </span>
          <span className="tabular text-ink-soft">
            {formatCurrency(material.dailyRate)} per {material.unit} per day
          </span>
          {dailyForLine > 0 ? (
            <span className="tabular ml-auto font-semibold text-brand">
              {formatCurrency(dailyForLine)}/day
            </span>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-danger">
          <AlertTriangle className="size-3.5" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function RentalItemTable({
  items,
  onChange,
  onRemove,
}: {
  items: DraftItem[];
  onChange: (materialId: string, quantity: number) => void;
  onRemove: (materialId: string) => void;
}) {
  const { materialById } = useAppStore();

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Boxes}
        title="No material added yet"
        message="Search for a material above, set the quantity and press Enter."
      />
    );
  }

  const totalDaily = items.reduce((sum, item) => {
    const material = materialById(item.materialId);
    return sum + calculateDailyRent(item.quantity, material?.dailyRate ?? 0);
  }, 0);

  return (
    <TableShell className="min-w-0">
      <thead>
        <tr>
          <Th>Material</Th>
          <Th align="right" className="w-32">
            Quantity
          </Th>
          <Th align="right">Rate / day</Th>
          <Th align="right">Daily total</Th>
          <Th align="right">
            <span className="sr-only">Remove</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const material = materialById(item.materialId) as Material | undefined;
          if (!material) return null;
          const overStock = item.quantity > material.availableStock;
          return (
            <Tr key={item.materialId}>
              <Td>
                <span className="block font-medium text-ink">{material.name}</span>
                <span className="tabular block text-[12px] text-ink-muted">
                  {formatNumber(material.availableStock)} available
                </span>
              </Td>
              <Td align="right">
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  aria-invalid={overStock}
                  aria-label={`Quantity of ${material.name}`}
                  onChange={(event) => onChange(item.materialId, Number(event.target.value))}
                  className="tabular ml-auto h-8 w-24 text-right"
                />
                {overStock ? (
                  <span className="mt-1 block text-[11.5px] font-medium text-danger">
                    Over available stock
                  </span>
                ) : null}
              </Td>
              <Td align="right">
                <span className="tabular text-[13px]">{formatCurrency(material.dailyRate)}</span>
              </Td>
              <Td align="right">
                <span className="tabular text-[13px] font-medium text-ink">
                  {formatCurrency(calculateDailyRent(item.quantity, material.dailyRate))}
                </span>
              </Td>
              <Td align="right">
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => onRemove(item.materialId)}
                  aria-label={`Remove ${material.name}`}
                >
                  <Trash2 />
                </Button>
              </Td>
            </Tr>
          );
        })}
        <tr>
          <Td colSpan={3} className="text-right font-medium text-ink">
            Total daily rent
          </Td>
          <Td align="right">
            <span className="tabular text-[15px] font-semibold text-ink">
              {formatCurrency(totalDaily)}
            </span>
          </Td>
          <Td />
        </tr>
      </tbody>
    </TableShell>
  );
}
