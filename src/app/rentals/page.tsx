"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { usePageMeta, PageIntro } from "@/components/layout/app-shell";
import { effectiveStatus } from "@/lib/calculations";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { TableSkeleton } from "@/components/ui/skeleton";
import { RentalTable } from "@/components/rentals/rental-table";

const tabs = ["all", "active", "overdue", "returned", "draft"] as const;
type Tab = (typeof tabs)[number];

function RentalsPageContent() {
  usePageMeta("Rentals", [{ label: "Rentals" }]);
  const searchParams = useSearchParams();
  const { state, ready, customerById } = useAppStore();

  const initialTab = (searchParams.get("tab") as Tab) ?? "all";
  const [tab, setTab] = React.useState<Tab>(tabs.includes(initialTab) ? initialTab : "all");
  const [query, setQuery] = React.useState("");

  const withStatus = React.useMemo(
    () => state.rentals.map((rental) => ({ rental, status: effectiveStatus(rental) })),
    [state.rentals],
  );

  const counts = React.useMemo(
    () => ({
      all: withStatus.filter((entry) => entry.status !== "cancelled").length,
      active: withStatus.filter((entry) => entry.status === "active").length,
      overdue: withStatus.filter((entry) => entry.status === "overdue").length,
      returned: withStatus.filter((entry) => entry.status === "returned").length,
      draft: withStatus.filter((entry) => entry.status === "draft").length,
    }),
    [withStatus],
  );

  const rentals = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return withStatus
      .filter((entry) => (tab === "all" ? entry.status !== "cancelled" : entry.status === tab))
      .filter((entry) => {
        if (!q) return true;
        const customer = customerById(entry.rental.customerId);
        const materials = entry.rental.items.map((item) => item.materialName).join(" ");
        return `${entry.rental.id} ${customer?.name ?? ""} ${customer?.phone ?? ""} ${materials}`
          .toLowerCase()
          .includes(q);
      })
      .map((entry) => entry.rental);
  }, [withStatus, tab, query, customerById]);

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
            onChange={(value) => setTab(value as Tab)}
            items={[
              { value: "all", label: "All", count: counts.all },
              { value: "active", label: "Active", count: counts.active },
              { value: "overdue", label: "Overdue", count: counts.overdue },
              { value: "returned", label: "Returned", count: counts.returned },
              { value: "draft", label: "Draft", count: counts.draft },
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
          {!ready ? (
            <TableSkeleton rows={7} columns={7} />
          ) : (
            <RentalTable
              rentals={rentals}
              pageSize={10}
              emptyTitle={
                query
                  ? "Nothing matches that search"
                  : tab === "overdue"
                    ? "Nothing is overdue"
                    : tab === "draft"
                      ? "No drafts saved"
                      : "No rentals in this list"
              }
              emptyMessage={
                query
                  ? "Try the rental id, the customer's mobile number, or a material name."
                  : tab === "overdue"
                    ? "A rental turns overdue only when it has an expected return date that has passed."
                    : "Create a rental to see it here."
              }
              emptyAction={
                !query ? (
                  <Link href="/rentals/new">
                    <Button variant="primary">New rental</Button>
                  </Link>
                ) : undefined
              }
            />
          )}
        </div>
      </Card>
    </div>
  );
}

/**
 * useSearchParams needs a suspense boundary so the route can still be
 * statically shelled by Next.
 */
export default function RentalsPage() {
  return (
    <React.Suspense fallback={<div className="skeleton h-72 rounded-card" />}>
      <RentalsPageContent />
    </React.Suspense>
  );
}
