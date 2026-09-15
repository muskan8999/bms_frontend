"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import type {
  Customer,
  CustomersListApiResponse,
} from "@/types";

import {
  usePageMeta,
  PageIntro,
} from "@/components/layout/app-shell";

import { formatNumber } from "@/lib/formatters";
import { callApi } from "@/service/ApiService";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import {
  Pagination,
  TableShell,
  Td,
  Th,
  Tr,
} from "@/components/ui/table";

import { RowMenu } from "@/components/ui/menu";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { CustomerFormDialog } from "@/components/customers/customer-form";

export default function CustomersPage() {
  usePageMeta("Customers", [{ label: "Customers" }]);

  const router = useRouter();
  const { toast } = useToast();

  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  const [page, setPage] = React.useState(1);
  const [totalCustomers, setTotalCustomers] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Customer | undefined>();

  const [deleting, setDeleting] = React.useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  const pageSize = 10;

  /*
   * Debounce search input
   */
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);


  const fetchCustomers = React.useCallback(async () => {
    try {
      setLoading(true);

      const response = await callApi<CustomersListApiResponse>({
        method: "GET",
        url: "/customers/all",
        params: {
          page,
          limit: pageSize,
          search: debouncedQuery.trim(),
        },
      });

      const result = response.result;

      setCustomers(result.customers ?? []);
      setTotalCustomers(result.totalCustomers ?? 0);
      setTotalPages(result.totalPages ?? 1);
    } catch (error) {
      console.error("Fetch customers error:", error);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQuery]);

  React.useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const openAdd = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  const openEdit = (customer: Customer) => {
    setEditing(customer);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!deleting) {
      return;
    }

    try {
      setDeleteLoading(true);

      await callApi({
        method: "DELETE",
        url: `/customers/${deleting.id}`,
      });

      toast({
        title: "Customer deleted",
        description: deleting.name,
        tone: "info",
      });

      setDeleting(null);

      /*
       * If last item of page is deleted,
       * move to previous page when required.
       */
      if (customers.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        await fetchCustomers();
      }
    } catch (error) {
      console.error("Delete customer error:", error);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageIntro
        description="Everyone who rents from the shop, with what they still owe and what is out with them right now."
        actions={
          <Button variant="primary" onClick={openAdd}>
            <UserPlus />
            Add customer
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3 p-3">
          <div className="relative min-w-[16rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />

            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or mobile number"
              className="pl-9"
            />
          </div>

          <span className="tabular text-[12px] text-ink-muted">
            {formatNumber(totalCustomers)} customers
          </span>
        </div>

        <div className="border-t border-line">
          {loading ? (
            <TableSkeleton rows={6} columns={6} />
          ) : customers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={
                debouncedQuery
                  ? "No customer matches that search"
                  : "No customers yet"
              }
              message={
                debouncedQuery
                  ? "Try another name or mobile number."
                  : "Add the first customer and you can start issuing material straight away."
              }
              action={
                <Button variant="primary" onClick={openAdd}>
                  Add customer
                </Button>
              }
            />
          ) : (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <Th>Customer</Th>
                    <Th>Mobile</Th>
                    <Th className="hidden lg:table-cell">
                      Address
                    </Th>
                    <Th align="right">Active</Th>
                    <Th align="right">Total rentals</Th>
                    <Th align="right">Pending</Th>
                    <Th align="right">
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </thead>

                <tbody>
                  {customers.map((customer) => (
                    <Tr
                      key={customer.id}
                      clickable
                      onClick={() =>
                        router.push(`/customers/${customer.id}`)
                      }
                    >
                      <Td>
                        <span className="block font-medium text-ink">
                          {customer.name}
                        </span>

                        <span className="tabular block text-[12px] text-ink-muted">
                          {customer.id}
                        </span>
                      </Td>

                      <Td>
                        <a
                          href={`tel:${customer.phone}`}
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                          className="tabular text-[13px] hover:text-brand"
                        >
                          {customer.phone}
                        </a>
                      </Td>

                      <Td className="hidden lg:table-cell">
                        <span className="block max-w-[18rem] truncate text-[13px]">
                          {customer.address || "—"}
                        </span>
                      </Td>

                      <Td align="right">
                        <span className="tabular text-ink-muted">
                          0
                        </span>
                      </Td>

                      <Td align="right">
                        <span className="tabular text-[13px]">
                          0
                        </span>
                      </Td>

                      <Td align="right">
                        <span className="tabular text-[13px] font-medium text-ink-muted">
                          —
                        </span>
                      </Td>

                      <Td
                        align="right"
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      >
                        <RowMenu
                          actions={[
                            {
                              label: "View profile",
                              icon: Eye,
                              onSelect: () =>
                                router.push(
                                  `/customers/${customer.id}`,
                                ),
                            },
                            {
                              label: "Edit customer",
                              icon: Pencil,
                              onSelect: () =>
                                openEdit(customer),
                            },
                            {
                              label: "Delete customer",
                              icon: Trash2,
                              tone: "danger",
                              separatorBefore: true,
                              onSelect: () =>
                                setDeleting(customer),
                            },
                          ]}
                        />
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </TableShell>

              <Pagination
                page={page}
                pageCount={totalPages}
                total={totalCustomers}
                onPageChange={setPage}
                label="customers"
              />
            </>
          )}
        </div>
      </Card>


      <CustomerFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        customer={editing}
        fetchCustomers={fetchCustomers}
        
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => {
          if (!deleteLoading) {
            setDeleting(null);
          }
        }}
        onConfirm={handleDelete}
        title={`Delete ${deleting?.name ?? "customer"}?`}
        message="Their past rentals and bills stay in the records, but the customer will no longer appear when creating a rental."
        confirmLabel={
          deleteLoading ? "Deleting..." : "Delete customer"
        }
      />
    </div>
  );
}