"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Info, PackageCheck } from "lucide-react";
import { useAppStore, useDayOptions } from "@/store/app-store";
import { usePageMeta, PageIntro } from "@/components/layout/app-shell";
import {
  buildInvoiceLines,
  calculateInvoiceTotal,
  calculateRemainingQuantity,
  calculateRentalDays,
  validateReturnQuantity,
} from "@/lib/calculations";
import { formatCurrency, formatDate, formatDays, formatNumber, todayInput } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableShell, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";

export default function ReturnMaterialPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { rentalById, customerById, recordReturn, ready } = useAppStore();
  const dayOptions = useDayOptions();
  const { toast } = useToast();

  const rental = rentalById(params.id);
  const customer = customerById(rental?.customerId);

  usePageMeta(rental ? `Return · ${rental.id}` : "Return material", [
    { label: "Rentals", href: "/rentals" },
    { label: rental?.id ?? params.id, href: `/rentals/${params.id}` },
    { label: "Return" },
  ]);

  const [returnDate, setReturnDate] = React.useState(todayInput());
  const [quantities, setQuantities] = React.useState<Record<string, string>>({});
  const [damageCharges, setDamageCharges] = React.useState("");
  const [additionalCharges, setAdditionalCharges] = React.useState("");
  const [discount, setDiscount] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  // Default to returning everything still out — the common case at the counter.
  React.useEffect(() => {
    if (!rental) return;
    setQuantities(
      Object.fromEntries(
        rental.items.map((item) => [item.materialId, String(calculateRemainingQuantity(item))]),
      ),
    );
  }, [rental?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <div className="skeleton h-72 rounded-card" />;

  if (!rental) {
    return (
      <EmptyState
        title="Rental not found"
        message="This rental id does not exist."
        action={
          <Link href="/rentals">
            <Button variant="primary">Back to rentals</Button>
          </Link>
        }
      />
    );
  }

  if (rental.status === "returned" || rental.status === "cancelled") {
    return (
      <EmptyState
        icon={PackageCheck}
        title={`${rental.id} is already closed`}
        message="Everything on this rental has been returned. Open the rental to see the bill."
        action={
          <Link href={`/rentals/${rental.id}`}>
            <Button variant="primary">Open rental</Button>
          </Link>
        }
      />
    );
  }

  const lines = rental.items.map((item) => {
    const remaining = calculateRemainingQuantity(item);
    const entered = Number(quantities[item.materialId] ?? 0);
    return { item, remaining, entered: Number.isFinite(entered) ? entered : 0 };
  });

  const returningNow = lines.reduce((sum, line) => sum + line.entered, 0);
  const willBeFullyReturned = lines.every((line) => line.remaining - line.entered === 0);
  const days = calculateRentalDays(rental.issueDate, returnDate, dayOptions);

  const invoiceLines = buildInvoiceLines(rental, returnDate, dayOptions);
  const totals = calculateInvoiceTotal({
    lines: invoiceLines,
    damageCharges: Number(damageCharges) || 0,
    additionalCharges: Number(additionalCharges) || 0,
    discount: Number(discount) || 0,
  });

  const submit = () => {
    const next: Record<string, string> = {};

    if (!returnDate) next.returnDate = "Enter the date the material came back.";
    else if (new Date(returnDate) < new Date(rental.issueDate))
      next.returnDate = "The return date cannot be before the issue date.";

    lines.forEach((line) => {
      const check = validateReturnQuantity(line.entered, line.remaining, line.item.materialName);
      if (!check.ok) next[line.item.materialId] = check.message ?? "Check this quantity.";
    });

    if (returningNow <= 0) next.form = "Enter a quantity for at least one material.";
    if (Number(discount) > totals.subtotal + totals.damageCharges + totals.additionalCharges) {
      next.discount = "Discount cannot be more than the bill.";
    }

    setErrors(next);
    if (Object.keys(next).length > 0) {
      toast({ title: "Return not recorded", description: "Check the highlighted fields.", tone: "error" });
      return;
    }

    setSaving(true);
    const result = recordReturn({
      rentalId: rental.id,
      returnDate,
      lines: lines
        .filter((line) => line.entered > 0)
        .map((line) => ({ materialId: line.item.materialId, quantity: line.entered })),
      damageCharges: Number(damageCharges) || 0,
      additionalCharges: Number(additionalCharges) || 0,
      discount: Number(discount) || 0,
      notes: notes || undefined,
    });

    if (result.fullyReturned) {
      toast({
        title: `${rental.id} closed`,
        description: `Bill ${result.invoiceId} raised for ${formatCurrency(totals.totalAmount)}.`,
      });
      router.push(`/bills?invoice=${result.invoiceId}`);
    } else {
      toast({
        title: "Partial return recorded",
        description: `${formatNumber(result.returnedCount)} pieces back in stock. The rental stays active.`,
      });
      router.push(`/rentals/${rental.id}`);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageIntro
        description={`Record what ${customer?.name ?? "the customer"} brought back. Anything still out keeps the rental running.`}
        actions={
          <Link href={`/rentals/${rental.id}`}>
            <Button variant="secondary">
              <ArrowLeft />
              Back to rental
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Return date</CardTitle>
                <CardDescription>
                  This is the date rent is charged up to — not necessarily today.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Actual return date" htmlFor="returnDate" required error={errors.returnDate}>
                  <Input
                    id="returnDate"
                    type="date"
                    className="tabular"
                    min={rental.issueDate}
                    value={returnDate}
                    onChange={(event) => setReturnDate(event.target.value)}
                  />
                </Field>
                <div className="rounded-md bg-surface-muted px-3 py-2.5">
                  <p className="text-[12px] text-ink-muted">Rental duration</p>
                  <p className="tabular mt-0.5 text-[17px] font-semibold text-ink">
                    {formatDays(days)}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-muted">
                    {formatDate(rental.issueDate)} → {formatDate(returnDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>What is coming back</CardTitle>
                <CardDescription>
                  Quantities default to everything still out. Change any line for a partial return.
                </CardDescription>
              </div>
            </CardHeader>
            <div className="border-t border-line">
              <TableShell className="min-w-0">
                <thead>
                  <tr>
                    <Th>Material</Th>
                    <Th align="right">Rented</Th>
                    <Th align="right">Already back</Th>
                    <Th align="right" className="w-36">
                      Returning now
                    </Th>
                    <Th align="right">Still out after</Th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map(({ item, remaining, entered }) => {
                    const after = remaining - entered;
                    const error = errors[item.materialId];
                    return (
                      <Tr key={item.id}>
                        <Td>
                          <span className="font-medium text-ink">{item.materialName}</span>
                          <span className="tabular block text-[12px] text-ink-muted">
                            {formatCurrency(item.dailyRate)} per {item.unit} per day
                          </span>
                        </Td>
                        <Td align="right">
                          <span className="tabular text-[13px]">{formatNumber(item.quantity)}</span>
                        </Td>
                        <Td align="right">
                          <span className="tabular text-[13px]">
                            {formatNumber(item.returnedQuantity)}
                          </span>
                        </Td>
                        <Td align="right">
                          <Input
                            type="number"
                            min={0}
                            max={remaining}
                            aria-invalid={Boolean(error)}
                            aria-label={`Quantity of ${item.materialName} returning now`}
                            className="tabular ml-auto h-8 w-24 text-right"
                            value={quantities[item.materialId] ?? ""}
                            onChange={(event) => {
                              setQuantities((current) => ({
                                ...current,
                                [item.materialId]: event.target.value,
                              }));
                              setErrors((current) => ({ ...current, [item.materialId]: "", form: "" }));
                            }}
                          />
                          {error ? (
                            <span className="mt-1 block text-[11.5px] font-medium text-danger">
                              {error}
                            </span>
                          ) : null}
                        </Td>
                        <Td align="right">
                          <span
                            className={`tabular text-[13px] font-medium ${
                              after > 0 ? "text-amber" : "text-ink-muted"
                            }`}
                          >
                            {formatNumber(Math.max(0, after))}
                          </span>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </TableShell>
            </div>
            {errors.form ? (
              <p className="px-5 pb-4 text-[12.5px] font-medium text-danger">{errors.form}</p>
            ) : null}
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Charges and adjustments</CardTitle>
                <CardDescription>
                  {willBeFullyReturned
                    ? "These are applied to the bill raised on save."
                    : "Saved with the bill once the last item comes back."}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Damage charges (₹)" htmlFor="damage">
                  <Input
                    id="damage"
                    type="number"
                    min={0}
                    className="tabular"
                    placeholder="0"
                    value={damageCharges}
                    onChange={(event) => setDamageCharges(event.target.value)}
                  />
                </Field>
                <Field label="Additional charges (₹)" htmlFor="additional">
                  <Input
                    id="additional"
                    type="number"
                    min={0}
                    className="tabular"
                    placeholder="0"
                    value={additionalCharges}
                    onChange={(event) => setAdditionalCharges(event.target.value)}
                  />
                </Field>
                <Field label="Discount (₹)" htmlFor="discount" error={errors.discount}>
                  <Input
                    id="discount"
                    type="number"
                    min={0}
                    className="tabular"
                    placeholder="0"
                    value={discount}
                    onChange={(event) => setDiscount(event.target.value)}
                  />
                </Field>
              </div>
              <Field label="Notes" htmlFor="returnNotes">
                <Textarea
                  id="returnNotes"
                  rows={3}
                  placeholder="Condition of the material, who dropped it off, what the damage charge covers."
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </Field>
            </CardContent>
          </Card>
        </div>

        <div className="xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{willBeFullyReturned ? "Bill preview" : "Return summary"}</CardTitle>
                <CardDescription>
                  {willBeFullyReturned
                    ? "This bill is raised when you save."
                    : "No bill yet — material is still out."}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-muted">Returning now</span>
                <span className="tabular text-[13px] font-medium text-ink">
                  {formatNumber(returningNow)} pieces
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-ink-muted">Rental status after save</span>
                <Badge tone={willBeFullyReturned ? "success" : "brand"}>
                  {willBeFullyReturned ? "Returned" : "Still active"}
                </Badge>
              </div>

              {willBeFullyReturned ? (
                <>
                  <div className="space-y-2 border-t border-line pt-3">
                    {invoiceLines.map((line) => (
                      <div key={line.materialName} className="flex items-baseline justify-between gap-3">
                        <span className="tabular text-[12.5px] text-ink-muted">
                          {line.quantity} × {formatCurrency(line.dailyRate)} × {line.days}d
                        </span>
                        <span className="tabular text-[13px] text-ink">
                          {formatCurrency(line.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1.5 border-t border-line pt-3">
                    <Line label="Subtotal" value={totals.subtotal} />
                    {totals.damageCharges ? (
                      <Line label="Damage charges" value={totals.damageCharges} />
                    ) : null}
                    {totals.additionalCharges ? (
                      <Line label="Additional charges" value={totals.additionalCharges} />
                    ) : null}
                    {totals.discount ? (
                      <Line label="Discount" value={-totals.discount} />
                    ) : null}
                  </div>
                  <div className="flex items-baseline justify-between rounded-md bg-brand-soft px-3 py-3">
                    <span className="text-[13px] font-medium text-brand-ink">Grand total</span>
                    <span className="tabular text-[20px] font-semibold text-brand-ink">
                      {formatCurrency(totals.totalAmount)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex gap-2.5 rounded-md border border-line p-3">
                  <Info className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                  <p className="text-[12.5px] leading-relaxed text-ink-muted">
                    Part of this rental is still out, so the rental stays active and rent keeps
                    running on what remains. The bill is raised when the last piece comes back.
                  </p>
                </div>
              )}
            </CardContent>
            <div className="flex flex-col gap-2 border-t border-line p-4">
              <Button variant="primary" size="lg" loading={saving} onClick={submit} className="w-full">
                <PackageCheck />
                {willBeFullyReturned ? "Return all and raise bill" : "Record partial return"}
              </Button>
              <Button variant="ghost" onClick={() => router.back()} className="w-full">
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-ink-muted">{label}</span>
      <span className="tabular text-[13px] text-ink">{formatCurrency(value)}</span>
    </div>
  );
}
