"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Eye,
  FileText,
  PackageCheck,
  Pencil,
  PlayCircle,
  XCircle,
} from "lucide-react";
import type { Rental } from "@/types";
import { useAppStore, useDayOptions } from "@/store/app-store";
import {
  calculateRentalDailyRent,
  calculateRemainingQuantity,
  effectiveStatus,
  rentalDurationSoFar,
} from "@/lib/calculations";
import { formatCurrency, formatDate, formatDays } from "@/lib/formatters";
import { Pagination, TableShell, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { RowMenu, type MenuAction } from "@/components/ui/menu";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type SortKey = "id" | "customer" | "issueDate" | "days" | "dailyRent";

export function RentalTable({
  rentals,
  emptyTitle = "No rentals here yet",
  emptyMessage = "Rentals you create will show up in this list.",
  emptyAction,
  pageSize = 8,
}: {
  rentals: Rental[];
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  pageSize?: number;
}) {
  const router = useRouter();
  const { customerById, invoiceForRental, cancelRental, issueDraft } = useAppStore();
  const dayOptions = useDayOptions();
  const [sort, setSort] = React.useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "issueDate",
    dir: "desc",
  });
  const [page, setPage] = React.useState(1);
  const [cancelling, setCancelling] = React.useState<Rental | null>(null);

  React.useEffect(() => setPage(1), [rentals.length]);

  const sorted = React.useMemo(() => {
    const copy = [...rentals];
    copy.sort((a, b) => {
      const direction = sort.dir === "asc" ? 1 : -1;
      switch (sort.key) {
        case "customer":
          return (
            (customerById(a.customerId)?.name ?? "").localeCompare(
              customerById(b.customerId)?.name ?? "",
            ) * direction
          );
        case "days":
          return (rentalDurationSoFar(a, dayOptions) - rentalDurationSoFar(b, dayOptions)) * direction;
        case "dailyRent":
          return (
            (calculateRentalDailyRent(a.items) - calculateRentalDailyRent(b.items)) * direction
          );
        case "issueDate":
          return a.issueDate.localeCompare(b.issueDate) * direction;
        default:
          return a.id.localeCompare(b.id) * direction;
      }
    });
    return copy;
  }, [rentals, sort, customerById, dayOptions]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const rows = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );

  const sortState = (key: SortKey) => (sort.key === key ? sort.dir : false);

  if (rentals.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title={emptyTitle}
        message={emptyMessage}
        action={emptyAction}
      />
    );
  }

  return (
    <>
      <TableShell>
        <thead>
          <tr>
            <Th sortable sorted={sortState("id")} onSort={() => toggleSort("id")}>
              Rental
            </Th>
            <Th sortable sorted={sortState("customer")} onSort={() => toggleSort("customer")}>
              Customer
            </Th>
            <Th>Materials</Th>
            <Th sortable sorted={sortState("issueDate")} onSort={() => toggleSort("issueDate")}>
              Issued
            </Th>
            <Th align="right" sortable sorted={sortState("days")} onSort={() => toggleSort("days")}>
              Days
            </Th>
            <Th
              align="right"
              sortable
              sorted={sortState("dailyRent")}
              onSort={() => toggleSort("dailyRent")}
            >
              Daily rent
            </Th>
            <Th>Status</Th>
            <Th align="right">
              <span className="sr-only">Actions</span>
            </Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((rental) => {
            const customer = customerById(rental.customerId);
            const status = effectiveStatus(rental);
            const invoice = invoiceForRental(rental.id);
            const remaining = rental.items.reduce(
              (sum, item) => sum + calculateRemainingQuantity(item),
              0,
            );
            const closed = status === "returned" || status === "cancelled";

            const actions: MenuAction[] = [
              {
                label: "View details",
                icon: Eye,
                onSelect: () => router.push(`/rentals/${rental.id}`),
              },
            ];

            if (rental.status === "draft") {
              actions.push({
                label: "Issue this rental",
                icon: PlayCircle,
                onSelect: () => issueDraft(rental.id),
              });
            }

            if (!closed) {
              actions.push(
                {
                  label: "Edit rental",
                  icon: Pencil,
                  onSelect: () => router.push(`/rentals/${rental.id}?edit=1`),
                },
                {
                  label: "Record a return",
                  icon: PackageCheck,
                  onSelect: () => router.push(`/rentals/${rental.id}/return`),
                  disabled: rental.status === "draft",
                },
                {
                  label: "Cancel rental",
                  icon: XCircle,
                  tone: "danger",
                  separatorBefore: true,
                  onSelect: () => setCancelling(rental),
                },
              );
            } else if (invoice) {
              actions.push({
                label: "Open bill",
                icon: FileText,
                onSelect: () => router.push(`/bills?invoice=${invoice.id}`),
              });
            }

            return (
              <Tr
                key={rental.id}
                clickable
                onClick={() => router.push(`/rentals/${rental.id}`)}
              >
                <Td>
                  <span className="tabular text-[13px] font-medium text-ink">{rental.id}</span>
                </Td>
                <Td>
                  {customer ? (
                    <Link
                      href={`/customers/${customer.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="font-medium text-ink hover:text-brand"
                    >
                      {customer.name}
                    </Link>
                  ) : (
                    <span className="text-ink-muted">Deleted customer</span>
                  )}
                  <span className="tabular block text-[12px] text-ink-muted">
                    {customer?.phone}
                  </span>
                </Td>
                <Td>
                  <span className="block max-w-[16rem] truncate text-[13px]">
                    {rental.items
                      .map((item) => `${item.quantity} × ${item.materialName}`)
                      .join(", ")}
                  </span>
                  {remaining > 0 && status !== "draft" ? (
                    <span className="tabular block text-[12px] text-ink-muted">
                      {remaining} still out
                    </span>
                  ) : null}
                </Td>
                <Td>
                  <span className="tabular text-[13px]">{formatDate(rental.issueDate)}</span>
                </Td>
                <Td align="right">
                  <span className="tabular text-[13px]">
                    {rental.status === "draft"
                      ? "—"
                      : formatDays(rentalDurationSoFar(rental, dayOptions))}
                  </span>
                </Td>
                <Td align="right">
                  <span className="tabular text-[13px] font-medium text-ink">
                    {formatCurrency(calculateRentalDailyRent(rental.items))}
                  </span>
                </Td>
                <Td>
                  <StatusBadge status={status} />
                </Td>
                <Td align="right" onClick={(event) => event.stopPropagation()}>
                  <RowMenu actions={actions} />
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </TableShell>

      <Pagination
        page={page}
        pageCount={pageCount}
        total={sorted.length}
        onPageChange={setPage}
        label="rentals"
      />

      <ConfirmDialog
        open={Boolean(cancelling)}
        onClose={() => setCancelling(null)}
        onConfirm={() => cancelling && cancelRental(cancelling.id)}
        title={`Cancel ${cancelling?.id ?? "rental"}?`}
        message={
          <>
            The rental will be marked cancelled and every item on it goes back into available
            stock. No bill is raised. This cannot be undone.
          </>
        }
        confirmLabel="Cancel rental"
        cancelLabel="Keep rental"
      />
    </>
  );
}

export function RentalTableFooterHint() {
  return (
    <p className="px-4 pb-4 text-[12px] text-ink-muted">
      Day counts for active rentals update on their own. The bill is only raised when the material
      comes back.
    </p>
  );
}

export function NewRentalButton() {
  const router = useRouter();
  return (
    <Button variant="primary" onClick={() => router.push("/rentals/new")}>
      New rental
    </Button>
  );
}
