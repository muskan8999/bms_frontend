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

import type { GetRentalApiResponse, Rental } from "@/types";

import { usePageMeta, PageIntro } from "@/components/layout/app-shell";

import {
  formatCurrency,
  formatDate,
  formatDays,
  formatNumber,
  initials,
} from "@/lib/formatters";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { StatusBadge } from "@/components/ui/status-badge";

import {
  TableShell,
  Td,
  Th,
  Tr,
} from "@/components/ui/table";

import { EmptyState } from "@/components/ui/empty-state";

import {
  ConfirmDialog,
  Dialog,
} from "@/components/ui/dialog";

import { Field } from "@/components/ui/field";

import {
  Input,
  Textarea,
} from "@/components/ui/input";

import { useToast } from "@/components/ui/toast";

import {
  buildTimeline,
  RentalTimeline,
} from "@/components/rentals/rental-timeline";

import { callApi } from "@/service/ApiService";


function getRentalStatus(rental: Rental) {
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


/**
 * Total daily rent of all materials.
 *
 * Example:
 * Podi  × 2 × ₹10 = ₹20/day
 * Ghodi × 1 × ₹15 = ₹15/day
 *
 * Total = ₹35/day
 */
function getDailyRent(rental: Rental) {
  return rental.items.reduce(
    (total, item) =>
      total +
      Number(item.dailyRentalRate) *
        Number(item.quantity),
    0
  );
}


/**
 * Total quantity of all materials in this rental.
 */
function getTotalQuantity(rental: Rental) {
  return rental.items.reduce(
    (total, item) =>
      total + Number(item.quantity),
    0
  );
}


function getDaysOverdue(rental: Rental) {
  if (!rental.endDate) {
    return 0;
  }

  const endDate = new Date(rental.endDate);

  if (Number.isNaN(endDate.getTime())) {
    return 0;
  }

  const now = new Date();

  if (now <= endDate) {
    return 0;
  }

  return Math.ceil(
    (now.getTime() - endDate.getTime()) /
      (1000 * 60 * 60 * 24)
  );
}


function RentalDetailsPageContent() {
  const params = useParams<{ id: string }>();

  const router = useRouter();

  const searchParams = useSearchParams();

  const { toast } = useToast();

  const [rental, setRental] =
    React.useState<Rental | null>(null);

  const [loading, setLoading] =
    React.useState(true);

  const [error, setError] =
    React.useState("");

  const [cancelOpen, setCancelOpen] =
    React.useState(false);

  const [editOpen, setEditOpen] =
    React.useState(
      searchParams.get("edit") === "1"
    );

  const [editExpected, setEditExpected] =
    React.useState("");

  const [editNotes, setEditNotes] =
    React.useState("");


  usePageMeta(
    rental ? `Rental ${rental.id}` : "Rental",
    [
      {
        label: "Rentals",
        href: "/rentals",
      },
      {
        label: rental?.id ?? params.id,
      },
    ]
  );


  const fetchRental = React.useCallback(
    async () => {
      try {
        setLoading(true);

        setError("");

        const response =
          await callApi<GetRentalApiResponse>({
            method: "GET",
            url: `/rentals/${params.id}`,
          });

        setRental(response.rental);

        setEditExpected(
          response.rental?.endDate
            ? String(
                response.rental.endDate
              ).slice(0, 10)
            : ""
        );

        setEditNotes(
          response.rental?.notes ?? ""
        );
      } catch (error) {
        console.log(
          "get rental by id error",
          error
        );

        setRental(null);

        setError(
          error instanceof Error
            ? error.message
            : "Failed to fetch rental"
        );
      } finally {
        setLoading(false);
      }
    },
    [params.id]
  );


  React.useEffect(() => {
    if (params.id) {
      fetchRental();
    }
  }, [params.id, fetchRental]);


  if (loading) {
    return (
      <div className="mx-auto max-w-[1400px]">
        <div className="skeleton h-72 rounded-card" />
      </div>
    );
  }


  if (!rental) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Rental not found"
        message={
          error ||
          "This rental id does not exist in the records."
        }
        action={
          <Link href="/rentals">
            <Button variant="primary">
              Back to rentals
            </Button>
          </Link>
        }
      />
    );
  }


  const customer = rental.customer;

  const status = getRentalStatus(rental);

  const closed =
    status === "returned" ||
    status === "cancelled";

  const days = getRentalDays(rental);

  const dailyRent = getDailyRent(rental);

  const totalQuantity =
    getTotalQuantity(rental);

  const daysOverdue =
    getDaysOverdue(rental);

  const totalAmount =
    rental.totalAmount !== null &&
    rental.totalAmount !== undefined
      ? Number(rental.totalAmount)
      : dailyRent * days;

  const timeline = buildTimeline(
    rental,
    [],
    undefined
  );


  return (
    <div className="mx-auto max-w-[1400px]">

      <PageIntro
        actions={
          <>
            {!closed ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() =>
                    setEditOpen(true)
                  }
                >
                  <Pencil />
                  Edit
                </Button>

                <Button
                  variant="primary"
                  onClick={() =>
                    router.push(
                      `/rentals/${rental.id}/return`
                    )
                  }
                >
                  <PackageCheck />
                  Record a return
                </Button>

                <Button
                  variant="outlineDanger"
                  onClick={() =>
                    setCancelOpen(true)
                  }
                >
                  <XCircle />
                  Cancel
                </Button>
              </>
            ) : rental.status ===
              "COMPLETED" ? (
              <Button
                variant="primary"
                onClick={() =>
                  router.push(
                    `/bills?rental=${rental.id}`
                  )
                }
              >
                <FileText />
                Open bill
              </Button>
            ) : null}
          </>
        }
      />


      <div className="mb-4 flex flex-wrap items-center gap-3">

        <h2 className="tabular text-[22px] font-semibold tracking-tight text-ink">
          {rental.id}
        </h2>

        <StatusBadge status={status} />

        {status === "overdue" ? (
          <Badge tone="danger">
            {formatDays(daysOverdue)} past due
          </Badge>
        ) : null}

        {totalQuantity > 0 &&
        rental.status === "ACTIVE" ? (
          <Badge tone="amber">
            {formatNumber(totalQuantity)}{" "}
            {totalQuantity === 1
              ? "piece"
              : "pieces"}{" "}
            still out
          </Badge>
        ) : null}

      </div>


      <div className="grid gap-4 lg:grid-cols-3">

        <div className="space-y-4 lg:col-span-2">

          {/* MATERIAL */}

          <Card>

            <CardHeader>

              <div>

                <CardTitle>
                  Material on this rental
                </CardTitle>

                <CardDescription>
                  Rate below was locked when the
                  rental was created and will not
                  change.
                </CardDescription>

              </div>

            </CardHeader>


            <div className="border-t border-line">

              <TableShell className="min-w-0">

                <thead>

                  <tr>

                    <Th>
                      Material
                    </Th>

                    <Th align="right">
                      Rented
                    </Th>

                    <Th align="right">
                      Returned
                    </Th>

                    <Th align="right">
                      Remaining
                    </Th>

                    <Th align="right">
                      Locked rate
                    </Th>

                    <Th align="right">
                      Rent / day
                    </Th>

                  </tr>

                </thead>


                <tbody>

                  {rental.items.map((item) => {

                    const returned =
                      rental.status ===
                      "COMPLETED"
                        ? item.quantity
                        : 0;

                    const remaining =
                      rental.status ===
                      "ACTIVE"
                        ? item.quantity
                        : 0;

                    const itemDailyRent =
                      Number(
                        item.dailyRentalRate
                      ) *
                      Number(item.quantity);


                    return (
                      <Tr key={item.id}>

                        <Td>

                          <span className="font-medium text-ink">
                            {item.material?.name ??
                              "Unknown material"}
                          </span>

                          <span className="block text-[12px] capitalize text-ink-muted">
                            Material
                          </span>

                        </Td>


                        <Td align="right">

                          <span className="tabular text-[13px]">
                            {formatNumber(
                              item.quantity
                            )}
                          </span>

                        </Td>


                        <Td align="right">

                          <span className="tabular text-[13px]">
                            {formatNumber(
                              returned
                            )}
                          </span>

                        </Td>


                        <Td align="right">

                          <span
                            className={`tabular text-[13px] font-medium ${
                              rental.status ===
                              "ACTIVE"
                                ? "text-amber"
                                : "text-ink-muted"
                            }`}
                          >
                            {formatNumber(
                              remaining
                            )}
                          </span>

                        </Td>


                        <Td align="right">

                          <span className="tabular text-[13px]">
                            {formatCurrency(
                              Number(
                                item.dailyRentalRate
                              )
                            )}
                          </span>

                        </Td>


                        <Td align="right">

                          <span className="tabular text-[13px] font-medium text-ink">
                            {formatCurrency(
                              itemDailyRent
                            )}
                          </span>

                        </Td>

                      </Tr>
                    );
                  })}


                  <tr>

                    <Td
                      colSpan={5}
                      className="text-right font-medium text-ink"
                    >
                      Total daily rent
                    </Td>

                    <Td align="right">

                      <span className="tabular text-[15px] font-semibold text-ink">
                        {formatCurrency(
                          dailyRent
                        )}
                      </span>

                    </Td>

                  </tr>

                </tbody>

              </TableShell>

            </div>


            <CardContent className="pt-4">

              {rental.status ===
              "COMPLETED" ? (

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-success-soft px-3 py-3">

                  <span className="text-[13px] text-success">
                    Rental completed.
                  </span>

                  <span className="tabular text-[16px] font-semibold text-success">

                    {formatCurrency(
                      Number(
                        rental.totalAmount ?? 0
                      )
                    )}{" "}

                    total

                  </span>

                </div>

              ) : rental.status ===
                "CANCELLED" ? (

                <p className="rounded-md bg-surface-muted px-3 py-3 text-[12.5px] leading-relaxed text-ink-muted">
                  This rental has been
                  cancelled.
                </p>

              ) : (

                <div className="rounded-md bg-brand-soft px-3 py-3">

                  <div className="flex flex-wrap items-baseline justify-between gap-2">

                    <span className="text-[13px] text-brand-ink">

                      Running for{" "}

                      {formatDays(days)} at{" "}

                      {formatCurrency(
                        dailyRent
                      )}{" "}

                      per day

                    </span>


                    <span className="tabular text-[18px] font-semibold text-brand-ink">

                      {formatCurrency(
                        totalAmount
                      )}

                    </span>

                  </div>


                  <p className="mt-1 text-[12px] text-brand-ink/80">
                    Running estimate only. The
                    final bill is fixed when the
                    material comes back.
                  </p>

                </div>

              )}

            </CardContent>

          </Card>


          {/* RENTAL INFORMATION */}

          <Card>

            <CardHeader>

              <CardTitle>
                Rental information
              </CardTitle>

            </CardHeader>


            <CardContent className="space-y-2.5">

              <Row
                label="Issue date"
                value={formatDate(
                  rental.startDate
                )}
              />


              <Row
                label="Expected return"
                value={
                  rental.endDate
                    ? formatDate(
                        rental.endDate
                      )
                    : "Open ended"
                }
              />


              <Row
                label={
                  closed
                    ? "Rental duration"
                    : "Days so far"
                }
                value={formatDays(days)}
              />


              <Row
                label="Daily rent"
                value={formatCurrency(
                  dailyRent
                )}
              />


              <Row
                label="Quantity"
                value={formatNumber(
                  totalQuantity
                )}
              />


              <Row
                label="Total amount"
                value={
                  rental.totalAmount !== null &&
                  rental.totalAmount !==
                    undefined
                    ? formatCurrency(
                        Number(
                          rental.totalAmount
                        )
                      )
                    : "Not finalized"
                }
              />


              {rental.notes ? (
                <p className="mt-3 rounded-md bg-surface-muted p-3 text-[12.5px] leading-relaxed text-ink-soft">
                  {rental.notes}
                </p>
              ) : null}

            </CardContent>

          </Card>


          {/* TIMELINE */}

          <Card>

            <CardHeader>

              <CardTitle>
                Timeline
              </CardTitle>

            </CardHeader>


            <CardContent>

              <RentalTimeline
                events={timeline}
              />

            </CardContent>

          </Card>

        </div>


        {/* CUSTOMER */}

        <div className="space-y-4">

          <Card>

            <CardHeader>

              <CardTitle>
                Customer
              </CardTitle>

            </CardHeader>


            <CardContent>

              {customer ? (
                <>

                  <div className="flex items-center gap-3">

                    <span className="flex size-10 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand-ink">

                      {initials(
                        customer.name
                      )}

                    </span>


                    <div className="min-w-0">

                      <p className="truncate text-[14px] font-semibold text-ink">
                        {customer.name}
                      </p>

                      <p className="tabular text-[12px] text-ink-muted">
                        {customer.id}
                      </p>

                    </div>

                  </div>


                  <dl className="mt-4 space-y-2.5 text-[13px]">

                    <div className="flex gap-2.5">

                      <Phone className="mt-0.5 size-4 shrink-0 text-ink-muted" />

                      <a
                        href={`tel:${customer.phone}`}
                        className="tabular hover:text-brand"
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

                  </dl>


                  <Link
                    href={`/customers/${customer.id}`}
                  >

                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-4 w-full"
                    >
                      <User />
                      View customer profile
                    </Button>

                  </Link>

                </>

              ) : (

                <p className="text-[13px] text-ink-muted">
                  This customer record was
                  deleted.
                </p>

              )}

            </CardContent>

          </Card>

        </div>

      </div>


      {/* EDIT DIALOG */}

      <Dialog
        open={editOpen}
        onClose={() =>
          setEditOpen(false)
        }
        title={`Edit ${rental.id}`}
        description="Update the rental information."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                setEditOpen(false)
              }
            >
              Cancel
            </Button>


            <Button
              variant="primary"
              onClick={() => {
                setEditOpen(false);

                toast({
                  title:
                    "Rental update API not connected yet",
                });
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
              min={String(
                rental.startDate
              ).slice(0, 10)}
              className="tabular"
              value={editExpected}
              onChange={(event) =>
                setEditExpected(
                  event.target.value
                )
              }
            />

          </Field>


          <Field
            label="Notes"
            htmlFor="editNotes"
          >

            <Textarea
              id="editNotes"
              rows={3}
              value={editNotes}
              onChange={(event) =>
                setEditNotes(
                  event.target.value
                )
              }
            />

          </Field>

        </div>

      </Dialog>


      {/* CANCEL DIALOG */}

      <ConfirmDialog
        open={cancelOpen}
        onClose={() =>
          setCancelOpen(false)
        }
        onConfirm={() => {
          setCancelOpen(false);

          toast({
            title:
              "Cancel rental API not connected yet",
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


function Row({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">

      <span className="text-[13px] text-ink-muted">
        {label}
      </span>

      <span className="tabular text-[13px] font-medium text-ink">
        {value}
      </span>

    </div>
  );
}


/**
 * useSearchParams needs a suspense boundary so the route can still be
 * statically shelled by Next.
 */
export default function RentalDetailsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="skeleton h-72 rounded-card" />
      }
    >
      <RentalDetailsPageContent />
    </React.Suspense>
  );
}