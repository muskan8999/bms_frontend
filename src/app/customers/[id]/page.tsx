"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FileText,
  MapPin,
  Pencil,
  Phone,
  Plus,
  ShieldCheck,
  StickyNote,
} from "lucide-react";

import { useAppStore, useDayOptions } from "@/store/app-store";
import { usePageMeta, PageIntro } from "@/components/layout/app-shell";
import { isRunning } from "@/lib/analytics";
import { balanceDue, runningRentEstimate } from "@/lib/calculations";
import { formatCurrency, formatDate, initials } from "@/lib/formatters";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { TableShell, Td, Th, Tr } from "@/components/ui/table";
import { PaymentBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { RentalTable } from "@/components/rentals/rental-table";

import type {
  Customer,
  CustomerCreateApiResponse,
} from "@/types";
import { callApi } from "@/service/ApiService";

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const {
    rentalsForCustomer,
    invoicesForCustomer,
    ready,
  } = useAppStore();

  const dayOptions = useDayOptions();

  const [customer, setCustomer] = React.useState<Customer | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editOpen, setEditOpen] = React.useState(false);

  const customerId = params.id;

  const fetchCustomer = React.useCallback(async () => {
    try {
      setLoading(true);

      const response = await callApi<CustomerCreateApiResponse>({
        method: "GET",
        url: `/customers/${customerId}`,
      });

      setCustomer(response.customer);
    } catch (error) {
      console.error("Fetch customer error:", error);
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  React.useEffect(() => {
    if (customerId) {
      fetchCustomer();
    }
  }, [customerId, fetchCustomer]);

  usePageMeta(customer?.name ?? "Customer", [
    { label: "Customers", href: "/customers" },
    { label: customer?.name ?? customerId },
  ]);

  /*
   * These two are still coming from app-store.
   * Replace them with rental/invoice APIs when those endpoints are ready.
   */
  const rentals = customer ? rentalsForCustomer(customer.id) : [];
  const invoices = customer ? invoicesForCustomer(customer.id) : [];

  const active = rentals.filter(isRunning);

  const billed = invoices.reduce(
    (sum, invoice) => sum + invoice.totalAmount,
    0,
  );

  const pending = invoices.reduce(
    (sum, invoice) => sum + balanceDue(invoice),
    0,
  );

  const running = active.reduce(
    (sum, rental) => sum + runningRentEstimate(rental, dayOptions),
    0,
  );

  if (!ready || loading) {
    return <div className="skeleton h-64 rounded-card" />;
  }

  if (!customer) {
    return (
      <EmptyState
        title="Customer not found"
        message="This customer may have been deleted."
        action={
          <Link href="/customers">
            <Button variant="primary">
              Back to customers
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1400px]">
  
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-[16px] font-semibold text-brand-ink">
                {initials(customer.name)}
              </span>

              <div className="min-w-0">
                <p className="truncate text-[16px] font-semibold text-ink">
                  {customer.name}
                </p>

                <p className="tabular text-[12px] text-ink-muted">
                  {customer.id} · since{" "}
                  {formatDate(customer.createdAt)}
                </p>
              </div>
            </div>

            <dl className="mt-5 space-y-3 text-[13px]">
              <div className="flex gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-ink-muted" />

                <a
                  href={`tel:${customer.phone}`}
                  className="tabular text-ink hover:text-brand"
                >
                  {customer.phone}
                </a>
              </div>

              {customer.address ? (
                <div className="flex gap-2.5">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                  <span className="text-ink-soft">
                    {customer.address}
                  </span>
                </div>
              ) : null}

              {customer.notes ? (
                <div className="flex gap-2.5">
                  <StickyNote className="mt-0.5 size-4 shrink-0 text-ink-muted" />
                  <span className="leading-relaxed text-ink-soft">
                    {customer.notes}
                  </span>
                </div>
              ) : null}
            </dl>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4">
              <Stat
                label="Rentals"
                value={String(
                  rentals.filter((r) => r.status !== "draft").length,
                )}
              />

              <Stat
                label="Active now"
                value={String(active.length)}
              />

              <Stat
                label="Billed to date"
                value={formatCurrency(billed)}
              />

              <Stat
                label="Pending payment"
                value={formatCurrency(pending)}
                tone={pending > 0 ? "amber" : undefined}
              />
            </div>

            {running > 0 ? (
              <p className="mt-4 rounded-md bg-brand-soft px-3 py-2 text-[12.5px] leading-relaxed text-brand-ink">
                Roughly {formatCurrency(running)} of rent has built up
                on the material still out with this customer. The final
                figure is set on the return date.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Rental history</CardTitle>
                <CardDescription>
                  Every rental raised for this customer.
                </CardDescription>
              </div>
            </CardHeader>

            <div className="border-t border-line">
              <RentalTable
                rentals={rentals}
                pageSize={6}
                emptyTitle="No rentals yet"
                emptyMessage="Start a rental and it will be listed here."
                emptyAction={
                  <Button
                    variant="primary"
                    onClick={() =>
                      router.push(
                        `/rentals/new?customer=${customer.id}`,
                      )
                    }
                  >
                    New rental
                  </Button>
                }
              />
            </div>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Bills</CardTitle>
                <CardDescription>
                  Raised once material comes back.
                </CardDescription>
              </div>
            </CardHeader>

            <div className="border-t border-line">
              {invoices.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No bills yet"
                  message="A bill appears here as soon as a rental is fully returned."
                />
              ) : (
                <TableShell className="min-w-0">
                  <thead>
                    <tr>
                      <Th>Invoice</Th>
                      <Th>Rental</Th>
                      <Th>Returned</Th>
                      <Th align="right">Amount</Th>
                      <Th align="right">Balance</Th>
                      <Th>Payment</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {invoices.map((invoice) => (
                      <Tr
                        key={invoice.id}
                        clickable
                        onClick={() =>
                          router.push(
                            `/bills?invoice=${invoice.id}`,
                          )
                        }
                      >
                        <Td>
                          <span className="tabular font-medium text-ink">
                            {invoice.id}
                          </span>
                        </Td>

                        <Td>
                          <span className="tabular text-[13px]">
                            {invoice.rentalId}
                          </span>
                        </Td>

                        <Td>
                          <span className="tabular text-[13px]">
                            {formatDate(invoice.returnDate)}
                          </span>
                        </Td>

                        <Td align="right">
                          <span className="tabular text-[13px] font-medium text-ink">
                            {formatCurrency(invoice.totalAmount)}
                          </span>
                        </Td>

                        <Td align="right">
                          <span className="tabular text-[13px]">
                            {formatCurrency(balanceDue(invoice))}
                          </span>
                        </Td>

                        <Td>
                          <PaymentBadge status={invoice.status} />
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </TableShell>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "amber";
}) {
  return (
    <div>
      <p className="text-[12px] text-ink-muted">
        {label}
      </p>

      <p
        className={`tabular mt-0.5 text-[17px] font-semibold ${
          tone === "amber" ? "text-amber" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}