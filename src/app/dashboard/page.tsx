"use client";

import * as React from "react";
import Link from "next/link";
import {
  Boxes,
  ClipboardList,
  IndianRupee,
  PackageOpen,
  TimerOff,
  UserPlus,
  Users,
} from "lucide-react";
import { useAppStore, useDayOptions } from "@/store/app-store";
import { usePageMeta, PageIntro } from "@/components/layout/app-shell";
import {
  dashboardStats,
  popularMaterials,
  rentalActivity,
  revenueSeries,
} from "@/lib/analytics";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { effectiveStatus } from "@/lib/calculations";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RentalActivityChart } from "@/components/dashboard/rental-activity-chart";
import { PopularMaterials } from "@/components/dashboard/popular-materials";
import { RentalTable } from "@/components/rentals/rental-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartSkeleton, StatsSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { CustomerFormDialog } from "@/components/customers/customer-form";

export default function DashboardPage() {
  usePageMeta("Dashboard");
  const { state, ready } = useAppStore();
  const dayOptions = useDayOptions();
  const [addCustomerOpen, setAddCustomerOpen] = React.useState(false);

  const stats = React.useMemo(
    () =>
      dashboardStats(
        {
          rentals: state.rentals,
          invoices: state.invoices,
          materials: state.materials,
          customers: state.customers,
        },
        dayOptions,
      ),
    [state, dayOptions],
  );

  const revenue = React.useMemo(() => revenueSeries(state.rentals, 7), [state.rentals]);
  const activity = React.useMemo(() => rentalActivity(state.rentals), [state.rentals]);
  const materials = React.useMemo(() => popularMaterials(state.rentals, 5), [state.rentals]);

  const recent = React.useMemo(
    () =>
      [...state.rentals]
        .filter((rental) => effectiveStatus(rental) !== "cancelled")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6),
    [state.rentals],
  );

  const weekChange = React.useMemo(() => {
    const first = revenue[0]?.amount ?? 0;
    const last = revenue[revenue.length - 1]?.amount ?? 0;
    if (!first) return null;
    const pct = Math.round(((last - first) / first) * 100);
    return { direction: pct >= 0 ? ("up" as const) : ("down" as const), value: `${Math.abs(pct)}%` };
  }, [revenue]);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageIntro
        description="Everything currently out on rent, what is owed, and what came back today."
        actions={
          <>
            <Button variant="secondary" onClick={() => setAddCustomerOpen(true)}>
              <UserPlus />
              Add customer
            </Button>
            <Link href="/rentals/new">
              <Button variant="primary">
                <ClipboardList />
                New rental
              </Button>
            </Link>
          </>
        }
      />

      {!ready ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatsCard
            icon={ClipboardList}
            label="Active rentals"
            value={formatNumber(stats.activeCount)}
            support={`${formatCurrency(stats.openValue)} of rent running`}
            href="/rentals?tab=active"
          />
          <StatsCard
            icon={IndianRupee}
            label="Rent accruing today"
            value={formatCurrency(stats.todaysRent)}
            support="Charged per day until material returns"
            trend={weekChange ?? undefined}
          />
          <StatsCard
            icon={PackageOpen}
            label="Pending returns"
            value={formatNumber(stats.pendingReturns)}
            support="Pieces still with customers"
            tone="amber"
            href="/rentals?tab=active"
          />
          <StatsCard
            icon={Users}
            label="Customers"
            value={formatNumber(stats.customerCount)}
            support={`${formatCurrency(stats.outstanding)} outstanding`}
            href="/customers"
          />
          <StatsCard
            icon={Boxes}
            label="Materials in catalogue"
            value={formatNumber(stats.materialCount)}
            support="Active items available to rent"
            href="/materials"
          />
          <StatsCard
            icon={TimerOff}
            label="Overdue rentals"
            value={formatNumber(stats.overdueCount)}
            support={
              stats.overdueCount
                ? "Past the agreed return date"
                : "Nothing past its agreed return date"
            }
            tone={stats.overdueCount ? "danger" : "success"}
            href="/rentals?tab=overdue"
          />
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Rent accrued, last 7 days</CardTitle>
              <CardDescription>
                What the material out on rent earns each day, including rentals still running.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pl-1">
            {ready ? <RevenueChart data={revenue} /> : <ChartSkeleton />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Most rented materials</CardTitle>
              <CardDescription>By total quantity issued.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {ready ? (
              materials.length ? (
                <PopularMaterials data={materials} />
              ) : (
                <p className="py-8 text-center text-[13px] text-ink-muted">
                  No material has been issued yet.
                </p>
              )
            ) : (
              <ChartSkeleton />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Rental activity</CardTitle>
              <CardDescription>Where every rental currently sits.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pl-1">
            {ready ? <RentalActivityChart data={activity} /> : <ChartSkeleton />}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Recent rentals</CardTitle>
              <CardDescription>The last six records created.</CardDescription>
            </div>
            <Link href="/rentals">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>
          <div className="border-t border-line">
            {ready ? (
              <RentalTable
                rentals={recent}
                pageSize={6}
                emptyTitle="No rentals yet"
                emptyMessage="Create the first rental and it will appear here."
                emptyAction={
                  <Link href="/rentals/new">
                    <Button variant="primary">New rental</Button>
                  </Link>
                }
              />
            ) : (
              <TableSkeleton rows={5} columns={6} />
            )}
          </div>
        </Card>
      </div>

      <CustomerFormDialog open={addCustomerOpen} onClose={() => setAddCustomerOpen(false)} />
    </div>
  );
}
