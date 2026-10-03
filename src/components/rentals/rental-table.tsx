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
  XCircle,
} from "lucide-react";

import type { Rental, RentalDisplayStatus } from "@/types";
import { formatCurrency, formatDate, formatDays } from "@/lib/formatters";
import { TableShell, Td, Th, Tr } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { RowMenu, type MenuAction } from "@/components/ui/menu";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/dialog";


function getRentalStatus(rental: Rental): RentalDisplayStatus  {
  if (rental.status === "CANCELLED") {
    return "cancelled";
  }

  if (rental.status === "COMPLETED") {
    return "returned";
  }

  if (
    rental.status === "ACTIVE" &&
    rental.endDate &&
    new Date(rental.endDate).getTime() < Date.now()
  ) {
    return "overdue";
  }

  return "active";
}

function getRentalDays(rental: Rental) {
  const startDate = new Date(rental.startDate);

  if (Number.isNaN(startDate.getTime())) {
    return 0;
  }

  const endDate = rental.endDate
    ? new Date(rental.endDate)
    : new Date();

  if (Number.isNaN(endDate.getTime())) {
    return 0;
  }

  const difference =
    endDate.getTime() - startDate.getTime();

  return Math.max(
    1,
    Math.ceil(
      difference / (1000 * 60 * 60 * 24)
    )
  );
}

function getDailyRent(rental: Rental) {
  return Number(rental.dailyRentalRate) || 0;
}

export function RentalTable({
  rentals,
  emptyTitle = "No rentals here yet",
  emptyMessage = "Rentals you create will show up in this list.",
  emptyAction,
}: {
  rentals: Rental[];
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
}) {
  const router = useRouter();

  const [cancelling, setCancelling] =
    React.useState<Rental | null>(null);

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
            <Th>Rental</Th>

            <Th>Customer</Th>

            <Th>Materials</Th>

            <Th>Issued</Th>

            <Th align="right">Days</Th>

            <Th align="right">Daily rent</Th>

            <Th>Status</Th>

            <Th align="right">
              <span className="sr-only">
                Actions
              </span>
            </Th>
          </tr>
        </thead>

        <tbody>
          {rentals.map((rental) => {
            const customer = rental.customer;

            const status = getRentalStatus(rental);

            const days = getRentalDays(rental);

            const dailyRent = getDailyRent(rental);

            const closed =
              status === "returned" ||
              status === "cancelled";

            const actions: MenuAction[] = [
              {
                label: "View details",
                icon: Eye,
                onSelect: () =>
                  router.push(
                    `/rentals/${rental.id}`
                  ),
              },
            ];

            if (!closed) {
              actions.push(
                {
                  label: "Edit rental",
                  icon: Pencil,
                  onSelect: () =>
                    router.push(
                      `/rentals/${rental.id}?edit=1`
                    ),
                },
                {
                  label: "Record a return",
                  icon: PackageCheck,
                  onSelect: () =>
                    router.push(
                      `/rentals/${rental.id}/return`
                    ),
                },
                {
                  label: "Cancel rental",
                  icon: XCircle,
                  tone: "danger",
                  separatorBefore: true,
                  onSelect: () =>
                    setCancelling(rental),
                }
              );
            } else if (
              rental.status === "COMPLETED"
            ) {
              actions.push({
                label: "Open bill",
                icon: FileText,
                onSelect: () =>
                  router.push(
                    `/bills?rental=${rental.id}`
                  ),
              });
            }

            return (
              <Tr
                key={String(rental.id)}
                clickable
                onClick={() =>
                  router.push(
                    `/rentals/${rental.id}`
                  )
                }
              >
                {/* Rental ID */}
                <Td>
                  <span className="tabular text-[13px] font-medium text-ink">
                    {rental.id}
                  </span>
                </Td>

                {/* Customer */}
                <Td>
                  {customer ? (
                    <Link
                      href={`/customers/${customer.id}`}
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                      className="font-medium text-ink hover:text-brand"
                    >
                      {customer.name}
                    </Link>
                  ) : (
                    <span className="text-ink-muted">
                      Deleted customer
                    </span>
                  )}

                  <span className="tabular block text-[12px] text-ink-muted">
                    {customer?.phone ?? ""}
                  </span>
                </Td>

                {/* Material */}
                <Td>
                  <span className="block max-w-[16rem] truncate text-[13px]">
                    {rental.quantity} ×{" "}
                    {rental.material?.name ??
                      "Unknown material"}
                  </span>

                  {rental.quantity > 0 &&
                  status !== "cancelled" ? (
                    <span className="tabular block text-[12px] text-ink-muted">
                      {rental.quantity} out
                    </span>
                  ) : null}
                </Td>

                {/* Issue Date */}
                <Td>
                  <span className="tabular text-[13px]">
                    {formatDate(
                      rental.startDate
                    )}
                  </span>
                </Td>

                {/* Days */}
                <Td align="right">
                  <span className="tabular text-[13px]">
                    {formatDays(days)}
                  </span>
                </Td>

                {/* Daily Rent */}
                <Td align="right">
                  <span className="tabular text-[13px] font-medium text-ink">
                    {formatCurrency(dailyRent)}
                  </span>
                </Td>

                {/* Status */}
                <Td>
                  <StatusBadge status={status} />
                </Td>

                {/* Actions */}
                <Td
                  align="right"
                  onClick={(event) =>
                    event.stopPropagation()
                  }
                >
                  <RowMenu actions={actions} />
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </TableShell>

      <ConfirmDialog
        open={Boolean(cancelling)}
        onClose={() =>
          setCancelling(null)
        }
        onConfirm={() => {
          // Cancel API will be connected here.
          setCancelling(null);
        }}
        title={`Cancel ${
          cancelling?.id ?? "rental"
        }?`}
        message={
          <>
            The rental will be marked cancelled and
            every item on it goes back into available
            stock. No bill is raised. This cannot be
            undone.
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
      Day counts for active rentals update on their own.
      The bill is only raised when the material comes back.
    </p>
  );
}