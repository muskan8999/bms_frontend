"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { usePageMeta, PageIntro } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { TableSkeleton } from "@/components/ui/skeleton";
import { RentalTable } from "@/components/rentals/rental-table";
import { callApi } from "@/service/ApiService";

import type {
  Rental,
  RentalsApiResponse,
  RentalStatus,
} from "@/types";

const tabs = ["all", "active", "overdue", "returned", "draft"] as const;

type Tab = (typeof tabs)[number];

function RentalsPageContent() {
  usePageMeta("Rentals", [{ label: "Rentals" }]);

  const searchParams = useSearchParams();

  const initialTab = searchParams.get("tab") as Tab | null;

  const [tab, setTab] = React.useState<Tab>(
    initialTab && tabs.includes(initialTab) ? initialTab : "all",
  );

  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  const [rentals, setRentals] = React.useState<Rental[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalRentals, setTotalRentals] = React.useState(0);

  const pageSize = 10;

  /*
   * Debounce search
   */
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  /*
   * Fetch rentals
   */
  const fetchRentals = React.useCallback(async () => {
    try {
      setLoading(true);

      let status: RentalStatus | "" = "";

      if (tab === "active") {
        status = "ACTIVE";
      } else if (tab === "returned") {
        status = "COMPLETED";
      }

      const response = (await callApi({
        method: "GET",
        url: "/rentals/all",
        params: {
          page,
          limit: pageSize,
          search: debouncedQuery,
          status,
        },
      })) as RentalsApiResponse;

      if (response.success) {
        setRentals(response.rentalData?.rentals ?? []);
        setTotalPages(response.rentalData?.totalPages ?? 1);
        setTotalRentals(response.rentalData?.totalRentals ?? 0);
      } else {
        setRentals([]);
        setTotalPages(1);
        setTotalRentals(0);
      }
    } catch (error) {
      console.error("Failed to fetch rentals:", error);

      setRentals([]);
      setTotalPages(1);
      setTotalRentals(0);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQuery, tab]);

  React.useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  /*
   * Reset pagination when changing tab
   */
  const handleTabChange = (value: string) => {
    setTab(value as Tab);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageIntro
        description="Everything the shop has issued. Day counts on active rentals move on their own; the bill is raised only on return."
        actions={
          <Link href="/rentals/new">
            <Button variant="primary">
              <Plus />
              New rental
            </Button>
          </Link>
        }
      />

      <Card>
        <div className="px-3 pt-2">
          <Tabs
            value={tab}
            onChange={handleTabChange}
            items={[
              {
                value: "all",
                label: "All",
                count: totalRentals,
              },
              {
                value: "active",
                label: "Active",
              },
              {
                value: "overdue",
                label: "Overdue",
              },
              {
                value: "returned",
                label: "Returned",
              },
              {
                value: "draft",
                label: "Draft",
              },
            ]}
          />
        </div>

        <div className="p-3">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />

            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search rental id, customer or material"
              className="pl-9"
            />
          </div>
        </div>

        <div className="border-t border-line">
          {loading ? (
            <TableSkeleton rows={7} columns={7} />
          ) : (
            <>
              <RentalTable
                rentals={rentals}
                emptyTitle={
                  debouncedQuery
                    ? "Nothing matches that search"
                    : tab === "overdue"
                      ? "Nothing is overdue"
                      : tab === "draft"
                        ? "No drafts saved"
                        : "No rentals in this list"
                }
                emptyMessage={
                  debouncedQuery
                    ? "Try the rental id, the customer's mobile number, or a material name."
                    : tab === "overdue"
                      ? "A rental turns overdue only when it has an expected return date that has passed."
                      : "Create a rental to see it here."
                }
                emptyAction={
                  !debouncedQuery ? (
                    <Link href="/rentals/new">
                      <Button variant="primary">
                        New rental
                      </Button>
                    </Link>
                  ) : undefined
                }
              />

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-line px-4 py-3">
                  <p className="text-sm text-ink-muted">
                    Page {page} of {totalPages}
                  </p>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={page === 1}
                      onClick={() =>
                        setPage((prev) => prev - 1)
                      }
                    >
                      Previous
                    </Button>

                    <Button
                      variant="secondary"
                      disabled={page === totalPages}
                      onClick={() =>
                        setPage((prev) => prev + 1)
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function RentalsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="skeleton h-72 rounded-card" />
      }
    >
      <RentalsPageContent />
    </React.Suspense>
  );
}