import { eachDayOfInterval, format, isWithinInterval, subDays } from "date-fns";
import type { Customer, Invoice, Material, Rental } from "@/types";
import {
  calculateDailyRent,
  calculateRentalDays,
  calculateRemainingQuantity,
  isOverdue,
  runningRentEstimate,
  type DayCountOptions,
} from "@/lib/calculations";
import { toDate } from "@/lib/formatters";

type Data = {
  rentals: Rental[];
  invoices: Invoice[];
  materials: Material[];
  customers: Customer[];
};

export function isRunning(rental: Rental) {
  return rental.status === "active" || rental.status === "overdue";
}

/** Rent the shop earns today from everything currently out on rent. */
export function rentAccruingToday(rentals: Rental[]) {
  return rentals
    .filter(isRunning)
    .flatMap((rental) => rental.items)
    .reduce(
      (sum, item) => sum + calculateDailyRent(calculateRemainingQuantity(item), item.dailyRate),
      0,
    );
}

/** Was this rental out on the given day? */
function wasOutOn(rental: Rental, date: Date) {
  if (rental.status === "draft" || rental.status === "cancelled") return false;
  const start = toDate(rental.issueDate);
  const end = rental.actualReturnDate ? toDate(rental.actualReturnDate) : new Date();
  if (date < start) return false;
  return date <= end;
}

/** Daily rent accrual for a trailing window — the shape of the business. */
export function revenueSeries(rentals: Rental[], days = 7) {
  const today = new Date();
  return eachDayOfInterval({ start: subDays(today, days - 1), end: today }).map((date) => {
    const amount = rentals
      .filter((rental) => wasOutOn(rental, date))
      .flatMap((rental) => rental.items)
      .reduce((sum, item) => sum + calculateDailyRent(item.quantity, item.dailyRate), 0);
    return { date: format(date, "dd MMM"), iso: format(date, "yyyy-MM-dd"), amount };
  });
}

export function rentalActivity(rentals: Rental[]) {
  const active = rentals.filter((rental) => rental.status === "active" && !isOverdue(rental)).length;
  const overdue = rentals.filter((rental) => isOverdue(rental)).length;
  const returned = rentals.filter((rental) => rental.status === "returned").length;
  const draft = rentals.filter((rental) => rental.status === "draft").length;
  return [
    { name: "Active", value: active },
    { name: "Returned", value: returned },
    { name: "Overdue", value: overdue },
    { name: "Draft", value: draft },
  ];
}

/** Ranked by total quantity ever issued, with what is out right now. */
export function popularMaterials(rentals: Rental[], limit = 5) {
  const tally = new Map<string, { name: string; issued: number; outNow: number }>();

  rentals
    .filter((rental) => rental.status !== "draft" && rental.status !== "cancelled")
    .forEach((rental) => {
      rental.items.forEach((item) => {
        const entry = tally.get(item.materialId) ?? {
          name: item.materialName,
          issued: 0,
          outNow: 0,
        };
        entry.issued += item.quantity;
        if (isRunning(rental)) entry.outNow += calculateRemainingQuantity(item);
        tally.set(item.materialId, entry);
      });
    });

  return [...tally.entries()]
    .map(([id, entry]) => ({ id, ...entry }))
    .sort((a, b) => b.issued - a.issued)
    .slice(0, limit);
}

export function dashboardStats(data: Data, options: DayCountOptions = {}) {
  const active = data.rentals.filter(isRunning);
  const overdue = data.rentals.filter((rental) => isOverdue(rental));
  const pendingReturns = active.reduce(
    (sum, rental) =>
      sum + rental.items.reduce((inner, item) => inner + calculateRemainingQuantity(item), 0),
    0,
  );
  const outstanding = data.invoices.reduce(
    (sum, invoice) => sum + Math.max(0, invoice.totalAmount - invoice.paidAmount),
    0,
  );
  const collected = data.invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
  const billed = data.invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const openValue = active.reduce((sum, rental) => sum + runningRentEstimate(rental, options), 0);

  return {
    activeCount: active.length,
    overdueCount: overdue.length,
    pendingReturns,
    todaysRent: rentAccruingToday(data.rentals),
    customerCount: data.customers.length,
    materialCount: data.materials.filter((material) => material.isActive).length,
    outstanding,
    collected,
    billed,
    openValue,
  };
}

export function revenueInRange(invoices: Invoice[], start: Date, end: Date) {
  return invoices
    .filter((invoice) => isWithinInterval(toDate(invoice.returnDate), { start, end }))
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0);
}

export function customerActivity(data: Data, options: DayCountOptions = {}, limit = 6) {
  return data.customers
    .map((customer) => {
      const rentals = data.rentals.filter((rental) => rental.customerId === customer.id);
      const invoices = data.invoices.filter((invoice) => invoice.customerId === customer.id);
      const billed = invoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
      const pending = invoices.reduce(
        (sum, invoice) => sum + Math.max(0, invoice.totalAmount - invoice.paidAmount),
        0,
      );
      const running = rentals.filter(isRunning);
      return {
        customer,
        rentalCount: rentals.filter((rental) => rental.status !== "draft").length,
        activeCount: running.length,
        billed,
        pending,
        openValue: running.reduce((sum, rental) => sum + runningRentEstimate(rental, options), 0),
      };
    })
    .sort((a, b) => b.billed + b.openValue - (a.billed + a.openValue))
    .slice(0, limit);
}

export function averageRentalDuration(rentals: Rental[], options: DayCountOptions = {}) {
  const closed = rentals.filter((rental) => rental.status === "returned" && rental.actualReturnDate);
  if (!closed.length) return 0;
  const total = closed.reduce(
    (sum, rental) =>
      sum + calculateRentalDays(rental.issueDate, rental.actualReturnDate!, options),
    0,
  );
  return Math.round((total / closed.length) * 10) / 10;
}
