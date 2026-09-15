"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ClipboardList,
  FileText,
  MapPin,
  PackageCheck,
  Pencil,
  Phone,
  User,
  XCircle,
} from "lucide-react";
import { useAppStore, useDayOptions } from "@/store/app-store";
import { usePageMeta, PageIntro } from "@/components/layout/app-shell";
import {
  calculateDailyRent,
  calculateRentalDailyRent,
  calculateRemainingQuantity,
  calculateTotalRent,
  effectiveStatus,
  daysOverdue,
  rentalDurationSoFar,
  runningRentEstimate,
} from "@/lib/calculations";
import { formatCurrency, formatDate, formatDays, formatNumber, initials } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableShell, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { buildTimeline, RentalTimeline } from "@/components/rentals/rental-timeline";

function RentalDetailsPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    rentalById,
    customerById,
    returnsForRental,
    invoiceForRental,
    cancelRental,
    updateRental,
    issueDraft,
    ready,
  } = useAppStore();
  const dayOptions = useDayOptions();
  const { toast } = useToast();

  const rental = rentalById(params.id);
  const customer = customerById(rental?.customerId);
  const invoice = rental ? invoiceForRental(rental.id) : undefined;
  const returns = rental ? returnsForRental(rental.id) : [];

  usePageMeta(rental ? `Rental ${rental.id}` : "Rental", [
    { label: "Rentals", href: "/rentals" },
    { label: rental?.id ?? params.id },
  ]);

  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(searchParams.get("edit") === "1");
  const [editExpected, setEditExpected] = React.useState(rental?.expectedReturnDate ?? "");
  const [editNotes, setEditNotes] = React.useState(rental?.notes ?? "");

  React.useEffect(() => {
    setEditExpected(rental?.expectedReturnDate ?? "");
    setEditNotes(rental?.notes ?? "");
  }, [rental?.expectedReturnDate, rental?.notes]);

  if (!ready) return <div className="skeleton h-72 rounded-card" />;

  if (!rental) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Rental not found"
        message="This rental id does not exist in the records."
        action={
          <Link href="/rentals">
            <Button variant="primary">Back to rentals</Button>
          </Link>
        }
      />
    );
  }

  const status = effectiveStatus(rental);
  const closed = status === "returned" || status === "cancelled";
  const days = rentalDurationSoFar(rental, dayOptions);
  const dailyRent = calculateRentalDailyRent(rental.items);
  const estimate = runningRentEstimate(rental, dayOptions);
  const remaining = rental.items.reduce((sum, item) => sum + calculateRemainingQuantity(item), 0);
  const timeline = buildTimeline(rental, returns, invoice);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageIntro
        actions={
          <>
            {rental.status === "draft" ? (
              <Button
                variant="primary"
                onClick={() => {
                  issueDraft(rental.id);
                  toast({
                    title: `${rental.id} issued`,
                    description: "Stock has been taken out of the yard.",
                  });
                }}
              >
                Issue this rental
              </Button>
            ) : null}
            {!closed ? (
              <>
                <Button variant="secondary" onClick={() => setEditOpen(true)}>
                  <Pencil />
                  Edit
                </Button>
                <Button
                  variant="primary"
                  onClick={() => router.push(`/rentals/${rental.id}/return`)}
                  disabled={rental.status === "draft"}
                >
                  <PackageCheck />
                  Record a return
                </Button>
                <Button variant="outlineDanger" onClick={() => setCancelOpen(true)}>
                  <XCircle />
                  Cancel
                </Button>
              </>
            ) : invoice ? (
              <Button variant="primary" onClick={() => router.push(`/bills?invoice=${invoice.id}`)}>
                <FileText />
                Open bill {invoice.id}
              </Button>
            ) : null}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="tabular text-[22px] font-semibold tracking-tight text-ink">{rental.id}</h2>
        <StatusBadge status={status} />
        {status === "overdue" ? (
          <Badge tone="danger">{formatDays(daysOverdue(rental))} past due</Badge>
        ) : null}
        {remaining > 0 && rental.status !== "draft" ? (
          <Badge tone="amber">{formatNumber(remaining)} pieces still out</Badge>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Material on this rental</CardTitle>
                <CardDescription>
                  Rates below were locked when the rental was created and will not change.
                </CardDescription>
              </div>
            </CardHeader>
            <div className="border-t border-line">
              <TableShell className="min-w-0">
                <thead>
                  <tr>
                    <Th>Material</Th>
                    <Th align="right">Rented</Th>
                    <Th align="right">Returned</Th>
                    <Th align="right">Remaining</Th>
                    <Th align="right">Locked rate</Th>
                    <Th align="right">Rent / day</Th>
                  </tr>
                </thead>
                <tbody>
                  {rental.items.map((item) => (
                    <Tr key={item.id}>
                      <Td>
                        <span className="font-medium text-ink">{item.materialName}</span>
                        <span className="block text-[12px] capitalize text-ink-muted">
                          {item.unit}
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
                        <span
                          className={`tabular text-[13px] font-medium ${
                            calculateRemainingQuantity(item) > 0 ? "text-amber" : "text-ink-muted"
                          }`}
                        >
                          {formatNumber(calculateRemainingQuantity(item))}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="tabular text-[13px]">{formatCurrency(item.dailyRate)}</span>
                      </Td>
                      <Td align="right">
                        <span className="tabular text-[13px] font-medium text-ink">
                          {formatCurrency(calculateDailyRent(item.quantity, item.dailyRate))}
                        </span>
                      </Td>
                    </Tr>
                  ))}
                  <tr>
                    <Td colSpan={5} className="text-right font-medium text-ink">
                      Total daily rent
                    </Td>
                    <Td align="right">
                      <span className="tabular text-[15px] font-semibold text-ink">
                        {formatCurrency(dailyRent)}
                      </span>
                    </Td>
                  </tr>
                </tbody>
              </TableShell>
            </div>

            <CardContent className="pt-4">
              {closed && invoice ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-success-soft px-3 py-3">
                  <span className="text-[13px] text-success">
                    Returned on {formatDate(rental.actualReturnDate)} after {formatDays(invoice.totalDays)}.
                  </span>
                  <span className="tabular text-[16px] font-semibold text-success">
                    {formatCurrency(invoice.totalAmount)} billed
                  </span>
                </div>
              ) : rental.status === "draft" ? (
                <p className="rounded-md bg-surface-muted px-3 py-3 text-[12.5px] leading-relaxed text-ink-muted">
                  This is a draft. Stock is still on the shelf and no rent is accruing. Issue it when
                  the customer collects the material.
                </p>
              ) : (
                <div className="rounded-md bg-brand-soft px-3 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[13px] text-brand-ink">
                      Running for {formatDays(days)} at {formatCurrency(dailyRent)} per day
                    </span>
                    <span className="tabular text-[18px] font-semibold text-brand-ink">
                      {formatCurrency(estimate)}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] text-brand-ink/80">
                    Running estimate only. The bill is fixed on the day the material comes back.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Returns recorded</CardTitle>
                <CardDescription>Each time material came back to the yard.</CardDescription>
              </div>
            </CardHeader>
            <div className="border-t border-line">
              {returns.length === 0 ? (
                <EmptyState
                  icon={PackageCheck}
                  title="Nothing returned yet"
                  message="Record a return when the customer brings material back — full or partial."
                  action={
                    !closed && rental.status !== "draft" ? (
                      <Button
                        variant="primary"
                        onClick={() => router.push(`/rentals/${rental.id}/return`)}
                      >
                        Record a return
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <TableShell className="min-w-0">
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Material</Th>
                      <Th align="right">Quantity</Th>
                      <Th>Note</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {returns.map((record) => (
                      <Tr key={record.id}>
                        <Td>
                          <span className="tabular text-[13px]">{formatDate(record.returnDate)}</span>
                        </Td>
                        <Td>
                          <span className="text-[13px] font-medium text-ink">
                            {record.materialName}
                          </span>
                        </Td>
                        <Td align="right">
                          <span className="tabular text-[13px]">{formatNumber(record.quantity)}</span>
                        </Td>
                        <Td>
                          <span className="text-[12.5px] text-ink-muted">{record.notes ?? "—"}</span>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </TableShell>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              {customer ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand-ink">
                      {initials(customer.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-ink">{customer.name}</p>
                      <p className="tabular text-[12px] text-ink-muted">{customer.id}</p>
                    </div>
                  </div>
                  <dl className="mt-4 space-y-2.5 text-[13px]">
                    <div className="flex gap-2.5">
                      <Phone className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                      <a href={`tel:${customer.phone}`} className="tabular hover:text-brand">
                        {customer.phone}
                      </a>
                    </div>
                    {customer.address ? (
                      <div className="flex gap-2.5">
                        <MapPin className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                        <span className="text-ink-soft">{customer.address}</span>
                      </div>
                    ) : null}
                  </dl>
                  <Link href={`/customers/${customer.id}`}>
                    <Button variant="secondary" size="sm" className="mt-4 w-full">
                      <User />
                      View customer profile
                    </Button>
                  </Link>
                </>
              ) : (
                <p className="text-[13px] text-ink-muted">This customer record was deleted.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rental information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <Row label="Issue date" value={formatDate(rental.issueDate)} />
              <Row
                label="Expected return"
                value={rental.expectedReturnDate ? formatDate(rental.expectedReturnDate) : "Open ended"}
              />
              <Row
                label="Actual return"
                value={rental.actualReturnDate ? formatDate(rental.actualReturnDate) : "Not returned"}
              />
              <Row
                label={closed ? "Rental duration" : "Days so far"}
                value={rental.status === "draft" ? "—" : formatDays(days)}
              />
              <Row label="Daily rent" value={formatCurrency(dailyRent)} />
              {rental.notes ? (
                <p className="mt-3 rounded-md bg-surface-muted p-3 text-[12.5px] leading-relaxed text-ink-soft">
                  {rental.notes}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <RentalTimeline events={timeline} />
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit ${rental.id}`}
        description="Quantities are fixed once material is issued — record a return instead."
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                updateRental(rental.id, {
                  expectedReturnDate: editExpected || undefined,
                  notes: editNotes || undefined,
                });
                setEditOpen(false);
                toast({ title: "Rental updated" });
              }}
            >
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field
            label="Expected return date"
            htmlFor="expected"
            hint="Leave blank to keep the rental open ended."
          >
            <Input
              id="expected"
              type="date"
              min={rental.issueDate}
              className="tabular"
              value={editExpected}
              onChange={(event) => setEditExpected(event.target.value)}
            />
          </Field>
          <Field label="Notes" htmlFor="editNotes">
            <Textarea
              id="editNotes"
              rows={3}
              value={editNotes}
              onChange={(event) => setEditNotes(event.target.value)}
            />
          </Field>
        </div>
      </Dialog>

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => {
          cancelRental(rental.id);
          toast({
            title: `${rental.id} cancelled`,
            description: "All material has gone back into available stock.",
            tone: "info",
          });
        }}
        title={`Cancel ${rental.id}?`}
        message="Every item goes back into available stock and no bill is raised. This cannot be undone."
        confirmLabel="Cancel rental"
        cancelLabel="Keep rental"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-ink-muted">{label}</span>
      <span className="tabular text-[13px] font-medium text-ink">{value}</span>
    </div>
  );
}

/**
 * useSearchParams needs a suspense boundary so the route can still be
 * statically shelled by Next.
 */
export default function RentalDetailsPage() {
  return (
    <React.Suspense fallback={<div className="skeleton h-72 rounded-card" />}>
      <RentalDetailsPageContent />
    </React.Suspense>
  );
}
