"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Download, History, Search } from "lucide-react";
import { useAppStore, useDayOptions } from "@/store/app-store";
import { usePageMeta, PageIntro } from "@/components/layout/app-shell";
import { balanceDue, effectiveStatus, rentalDurationSoFar } from "@/lib/calculations";
import { formatCurrency, formatDate, formatDays, formatNumber, toDate } from "@/lib/formatters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Pagination, TableShell, Td, Th, Tr } from "@/components/ui/table";
import { PaymentBadge, StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

export default function HistoryPage() {
  usePageMeta("Rental history", [{ label: "Rental history" }]);
  const router = useRouter();
  const { state, ready, customerById, invoiceForRental } = useAppStore();
  const dayOptions = useDayOptions();
  const { toast } = useToast();

  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [sort, setSort] = React.useState<"newest" | "oldest" | "amount">("newest");
  const [page, setPage] = React.useState(1);

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.rentals
      .map((rental) => {
        const customer = customerById(rental.customerId);
        const invoice = invoiceForRental(rental.id);
        return {
          rental,
          customer,
          invoice,
          status: effectiveStatus(rental),
          duration: rentalDurationSoFar(rental, dayOptions),
          amount: invoice?.totalAmount ?? 0,
        };
      })
      .filter((row) => {
        if (status !== "all" && row.status !== status) return false;
        if (from && toDate(row.rental.issueDate) < toDate(from)) return false;
        if (to && toDate(row.rental.issueDate) > toDate(to)) return false;
        if (!q) return true;
        const materials = row.rental.items.map((item) => item.materialName).join(" ");
        return `${row.rental.id} ${row.customer?.name ?? ""} ${row.customer?.phone ?? ""} ${materials} ${row.invoice?.id ?? ""}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        if (sort === "amount") return b.amount - a.amount;
        const order = a.rental.issueDate.localeCompare(b.rental.issueDate);
        return sort === "newest" ? -order : order;
      });
  }, [state.rentals, query, status, from, to, sort, customerById, invoiceForRental, dayOptions]);

  React.useEffect(() => setPage(1), [query, status, from, to, sort]);

  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const visible = rows.slice((page - 1) * pageSize, page * pageSize);

  const exportCsv = () => {
    const header = [
      "Rental ID",
      "Customer",
      "Mobile",
      "Materials",
      "Issue date",
      "Return date",
      "Duration (days)",
      "Total amount",
      "Payment status",
      "Status",
    ];
    const body = rows.map((row) => [
      row.rental.id,
      row.customer?.name ?? "",
      row.customer?.phone ?? "",
      row.rental.items.map((item) => `${item.quantity} x ${item.materialName}`).join("; "),
      row.rental.issueDate,
      row.rental.actualReturnDate ?? "",
      String(row.duration),
      String(row.amount),
      row.invoice?.status ?? "",
      row.status,
    ]);
    const csv = [header, ...body]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `buildrent-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "History exported", description: `${rows.length} rows written to CSV.` });
  };

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setFrom("");
    setTo("");
  };

  const filtersActive = Boolean(query || from || to || status !== "all");

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageIntro
        description="Every rental the shop has ever raised, closed or still running."
        actions={
          <Button variant="secondary" onClick={exportCsv} disabled={rows.length === 0}>
            <Download />
            Export CSV
          </Button>
        }
      />

      <Card>
        <div className="grid gap-3 p-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rental id, customer, material"
              className="pl-9"
            />
          </div>
          <Select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Status">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="overdue">Overdue</option>
            <option value="returned">Returned</option>
            <option value="draft">Draft</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="tabular"
            aria-label="Issued from"
          />
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="tabular"
            aria-label="Issued until"
          />
          <Select
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
            aria-label="Sort"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="amount">Highest amount</option>
          </Select>
        </div>

        {filtersActive ? (
          <div className="flex items-center gap-3 px-3 pb-3 text-[12px] text-ink-muted">
            <span className="tabular">
              {formatNumber(rows.length)} of {formatNumber(state.rentals.length)} rentals
            </span>
            <Button variant="link" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : null}

        <div className="border-t border-line">
          {!ready ? (
            <TableSkeleton rows={8} columns={8} />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={History}
              title="Nothing in this range"
              message="Widen the date range or clear the filters to see more rentals."
              action={
                filtersActive ? (
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <Th>Rental</Th>
                    <Th>Customer</Th>
                    <Th className="hidden lg:table-cell">Materials</Th>
                    <Th>Issued</Th>
                    <Th>Returned</Th>
                    <Th align="right">Duration</Th>
                    <Th align="right">Amount</Th>
                    <Th>Payment</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <Tr
                      key={row.rental.id}
                      clickable
                      onClick={() => router.push(`/rentals/${row.rental.id}`)}
                    >
                      <Td>
                        <span className="tabular font-medium text-ink">{row.rental.id}</span>
                      </Td>
                      <Td>
                        <span className="font-medium text-ink">{row.customer?.name ?? "—"}</span>
                        <span className="tabular block text-[12px] text-ink-muted">
                          {row.customer?.phone}
                        </span>
                      </Td>
                      <Td className="hidden lg:table-cell">
                        <span className="block max-w-[15rem] truncate text-[13px]">
                          {row.rental.items
                            .map((item) => `${item.quantity} × ${item.materialName}`)
                            .join(", ")}
                        </span>
                      </Td>
                      <Td>
                        <span className="tabular text-[13px]">{formatDate(row.rental.issueDate)}</span>
                      </Td>
                      <Td>
                        <span className="tabular text-[13px]">
                          {row.rental.actualReturnDate
                            ? formatDate(row.rental.actualReturnDate)
                            : "—"}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="tabular text-[13px]">
                          {row.rental.status === "draft" ? "—" : formatDays(row.duration)}
                        </span>
                      </Td>
                      <Td align="right">
                        <span className="tabular text-[13px] font-medium text-ink">
                          {row.invoice ? formatCurrency(row.invoice.totalAmount) : "—"}
                        </span>
                        {row.invoice && balanceDue(row.invoice) > 0 ? (
                          <span className="tabular block text-[12px] text-amber">
                            {formatCurrency(balanceDue(row.invoice))} due
                          </span>
                        ) : null}
                      </Td>
                      <Td>
                        {row.invoice ? (
                          <PaymentBadge status={row.invoice.status} />
                        ) : (
                          <span className="text-[12px] text-ink-muted">Not billed</span>
                        )}
                      </Td>
                      <Td>
                        <StatusBadge status={row.status} />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </TableShell>
              <Pagination
                page={page}
                pageCount={pageCount}
                total={rows.length}
                onPageChange={setPage}
                label="rentals"
              />
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
