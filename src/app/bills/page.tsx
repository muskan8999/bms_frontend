"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Eye, FileText, Printer, Search, Wallet } from "lucide-react";
import type { Invoice } from "@/types";
import { useAppStore } from "@/store/app-store";
import { usePageMeta, PageIntro } from "@/components/layout/app-shell";
import { balanceDue } from "@/lib/calculations";
import { formatCurrency, formatDate, formatNumber } from "@/lib/formatters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { Pagination, TableShell, Td, Th, Tr } from "@/components/ui/table";
import { PaymentBadge } from "@/components/ui/status-badge";
import { RowMenu } from "@/components/ui/menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { InvoicePreview } from "@/components/billing/invoice-preview";

const tabs = ["all", "pending", "partial", "paid"] as const;
type Tab = (typeof tabs)[number];

function BillsPageContent() {
  usePageMeta("Bills", [{ label: "Bills" }]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, ready, customerById, markInvoicePaid, recordPayment } = useAppStore();
  const { toast } = useToast();

  const [tab, setTab] = React.useState<Tab>("all");
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [preview, setPreview] = React.useState<Invoice | null>(null);
  const [paying, setPaying] = React.useState<Invoice | null>(null);
  const [amount, setAmount] = React.useState("");

  React.useEffect(() => {
    const id = searchParams.get("invoice");
    if (!id) return;
    const match = state.invoices.find((invoice) => invoice.id === id);
    if (match) setPreview(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, ready]);

  // Keep the open preview in sync after a payment is recorded.
  React.useEffect(() => {
    if (!preview) return;
    const fresh = state.invoices.find((invoice) => invoice.id === preview.id);
    if (fresh && fresh !== preview) setPreview(fresh);
  }, [state.invoices, preview]);

  const counts = React.useMemo(
    () => ({
      all: state.invoices.length,
      pending: state.invoices.filter((invoice) => invoice.status === "pending").length,
      partial: state.invoices.filter((invoice) => invoice.status === "partial").length,
      paid: state.invoices.filter((invoice) => invoice.status === "paid").length,
    }),
    [state.invoices],
  );

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.invoices
      .filter((invoice) => (tab === "all" ? true : invoice.status === tab))
      .filter((invoice) => {
        if (!q) return true;
        const customer = customerById(invoice.customerId);
        return `${invoice.id} ${invoice.rentalId} ${customer?.name ?? ""} ${customer?.phone ?? ""}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.invoices, tab, query, customerById]);

  React.useEffect(() => setPage(1), [tab, query]);

  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);

  const outstanding = state.invoices.reduce((sum, invoice) => sum + balanceDue(invoice), 0);
  const collected = state.invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);

  const savePayment = () => {
    if (!paying) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    recordPayment(paying.id, value);
    toast({
      title: "Payment recorded",
      description: `${formatCurrency(value)} against ${paying.id}.`,
    });
    setPaying(null);
    setAmount("");
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageIntro
        description={`${formatCurrency(collected)} collected, ${formatCurrency(outstanding)} still outstanding across ${formatNumber(state.invoices.length)} bills.`}
      />

      <Card>
        <div className="px-3 pt-2">
          <Tabs
            value={tab}
            onChange={(value) => setTab(value as Tab)}
            items={[
              { value: "all", label: "All", count: counts.all },
              { value: "pending", label: "Pending", count: counts.pending },
              { value: "partial", label: "Part paid", count: counts.partial },
              { value: "paid", label: "Paid", count: counts.paid },
            ]}
          />
        </div>

        <div className="p-3">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search invoice, rental id or customer"
              className="pl-9"
            />
          </div>
        </div>

        <div className="border-t border-line">
          {!ready ? (
            <TableSkeleton rows={6} columns={7} />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={query || tab !== "all" ? "No bills match this view" : "No bills yet"}
              message={
                query || tab !== "all"
                  ? "Try a different tab or clear the search."
                  : "A bill is raised automatically the moment a rental is fully returned."
              }
            />
          ) : (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <Th>Invoice</Th>
                    <Th>Customer</Th>
                    <Th className="hidden lg:table-cell">Rental</Th>
                    <Th className="hidden md:table-cell">Period</Th>
                    <Th align="right">Days</Th>
                    <Th align="right">Amount</Th>
                    <Th align="right">Balance</Th>
                    <Th>Payment</Th>
                    <Th align="right">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((invoice) => {
                    const customer = customerById(invoice.customerId);
                    const balance = balanceDue(invoice);
                    return (
                      <Tr key={invoice.id} clickable onClick={() => setPreview(invoice)}>
                        <Td>
                          <span className="tabular font-medium text-ink">{invoice.id}</span>
                          <span className="tabular block text-[12px] text-ink-muted">
                            {formatDate(invoice.createdAt)}
                          </span>
                        </Td>
                        <Td>
                          <span className="font-medium text-ink">
                            {customer?.name ?? "Deleted customer"}
                          </span>
                          <span className="tabular block text-[12px] text-ink-muted">
                            {customer?.phone}
                          </span>
                        </Td>
                        <Td className="hidden lg:table-cell">
                          <span className="tabular text-[13px]">{invoice.rentalId}</span>
                        </Td>
                        <Td className="hidden md:table-cell">
                          <span className="tabular text-[12.5px]">
                            {formatDate(invoice.issueDate)} → {formatDate(invoice.returnDate)}
                          </span>
                        </Td>
                        <Td align="right">
                          <span className="tabular text-[13px]">{invoice.totalDays}</span>
                        </Td>
                        <Td align="right">
                          <span className="tabular text-[13px] font-medium text-ink">
                            {formatCurrency(invoice.totalAmount)}
                          </span>
                        </Td>
                        <Td align="right">
                          <span
                            className={`tabular text-[13px] ${
                              balance > 0 ? "font-medium text-amber" : "text-ink-muted"
                            }`}
                          >
                            {formatCurrency(balance)}
                          </span>
                        </Td>
                        <Td>
                          <PaymentBadge status={invoice.status} />
                        </Td>
                        <Td align="right" onClick={(event) => event.stopPropagation()}>
                          <RowMenu
                            actions={[
                              { label: "View invoice", icon: Eye, onSelect: () => setPreview(invoice) },
                              {
                                label: "Open rental",
                                icon: FileText,
                                onSelect: () => router.push(`/rentals/${invoice.rentalId}`),
                              },
                              {
                                label: "Record a payment",
                                icon: Wallet,
                                separatorBefore: true,
                                disabled: invoice.status === "paid",
                                onSelect: () => {
                                  setPaying(invoice);
                                  setAmount(String(balance));
                                },
                              },
                              {
                                label: "Mark as paid",
                                icon: Wallet,
                                disabled: invoice.status === "paid",
                                onSelect: () => {
                                  markInvoicePaid(invoice.id);
                                  toast({
                                    title: `${invoice.id} marked paid`,
                                    description: formatCurrency(invoice.totalAmount),
                                  });
                                },
                              },
                            ]}
                          />
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </TableShell>
              <Pagination
                page={page}
                pageCount={pageCount}
                total={rows.length}
                onPageChange={setPage}
                label="bills"
              />
            </>
          )}
        </div>
      </Card>

      <Dialog
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        size="xl"
        title={`Invoice ${preview?.id ?? ""}`}
        description="Print or share this with the customer."
        footer={
          preview ? (
            <>
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer />
                Print
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  toast({
                    title: "Download needs the backend",
                    description: "Print to PDF works today; a server-side PDF comes with the API.",
                    tone: "info",
                  })
                }
              >
                <Download />
                Download PDF
              </Button>
              {preview.status !== "paid" ? (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setPaying(preview);
                      setAmount(String(balanceDue(preview)));
                    }}
                  >
                    Record payment
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      markInvoicePaid(preview.id);
                      toast({ title: `${preview.id} marked paid` });
                    }}
                  >
                    Mark as paid
                  </Button>
                </>
              ) : null}
            </>
          ) : null
        }
      >
        {preview ? <InvoicePreview invoice={preview} /> : null}
      </Dialog>

      <Dialog
        open={Boolean(paying)}
        onClose={() => setPaying(null)}
        size="sm"
        title={`Record payment for ${paying?.id ?? ""}`}
        description={
          paying
            ? `${formatCurrency(balanceDue(paying))} outstanding of ${formatCurrency(paying.totalAmount)}.`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setPaying(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={savePayment}>
              Record payment
            </Button>
          </>
        }
      >
        <Field label="Amount received (₹)" htmlFor="amount">
          <Input
            id="amount"
            type="number"
            min={1}
            className="tabular"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && savePayment()}
          />
        </Field>
      </Dialog>
    </div>
  );
}

/**
 * useSearchParams needs a suspense boundary so the route can still be
 * statically shelled by Next.
 */
export default function BillsPage() {
  return (
    <React.Suspense fallback={<div className="skeleton h-72 rounded-card" />}>
      <BillsPageContent />
    </React.Suspense>
  );
}
