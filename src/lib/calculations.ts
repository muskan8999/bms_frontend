import { differenceInCalendarDays } from "date-fns";
import type {
  DayCountConvention,
  Invoice,
  InvoiceLine,
  Material,
  Rental,
  RentalItem,
} from "@/types";
import { toDate } from "@/lib/formatters";

/**
 * ─────────────────────────────────────────────────────────────
 * Billing configuration
 * ─────────────────────────────────────────────────────────────
 * Every day-count decision flows through `calculateRentalDays`, so a shop that
 * bills inclusively ("issue day counts too") only has to flip the convention in
 * Settings. Nothing else in the app counts days by hand.
 *
 *  exclusive → 14 Sep to 19 Sep = 5 days   (default)
 *  inclusive → 14 Sep to 19 Sep = 6 days
 */
export const BILLING_DEFAULTS = {
  convention: "exclusive" as DayCountConvention,
  /** Same-day returns still cost one day of rent. Set to 0 to disable. */
  minimumBillableDays: 1,
};

export type DayCountOptions = {
  convention?: DayCountConvention;
  minimumBillableDays?: number;
};

export function calculateRentalDays(
  issueDate: string | Date,
  returnDate: string | Date = new Date(),
  options: DayCountOptions = {},
): number {
  const convention = options.convention ?? BILLING_DEFAULTS.convention;
  const minimum = options.minimumBillableDays ?? BILLING_DEFAULTS.minimumBillableDays;

  const raw = differenceInCalendarDays(toDate(returnDate), toDate(issueDate));
  const days = convention === "inclusive" ? raw + 1 : raw;

  return Math.max(days, minimum);
}

/** quantity × locked daily rate = what this line costs per day. */
export function calculateDailyRent(quantity: number, dailyRate: number): number {
  return Math.max(0, quantity) * Math.max(0, dailyRate);
}

/** quantity × locked daily rate × days. */
export function calculateTotalRent(
  quantity: number,
  lockedDailyRate: number,
  actualRentalDays: number,
): number {
  return calculateDailyRent(quantity, lockedDailyRate) * Math.max(0, actualRentalDays);
}

/** Daily rent for every line on a rental added together. */
export function calculateRentalDailyRent(items: RentalItem[]): number {
  return items.reduce((sum, item) => sum + calculateDailyRent(item.quantity, item.dailyRate), 0);
}

export function calculateRemainingQuantity(item: RentalItem): number {
  return Math.max(0, item.quantity - item.returnedQuantity);
}

export function totalQuantity(items: RentalItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function totalRemainingQuantity(items: RentalItem[]): number {
  return items.reduce((sum, item) => sum + calculateRemainingQuantity(item), 0);
}

export function isFullyReturned(rental: Rental): boolean {
  return rental.items.every((item) => calculateRemainingQuantity(item) === 0);
}

/** available = total − currently rented out. */
export function calculateAvailableStock(totalStock: number, rentedQuantity: number): number {
  return Math.max(0, totalStock - rentedQuantity);
}

export function rentedQuantityForMaterial(materialId: string, rentals: Rental[]): number {
  return rentals
    .filter((rental) => rental.status === "active" || rental.status === "overdue")
    .flatMap((rental) => rental.items)
    .filter((item) => item.materialId === materialId)
    .reduce((sum, item) => sum + calculateRemainingQuantity(item), 0);
}

export type QuantityValidation = { ok: boolean; message?: string };

/** Guards the "can't rent out more than we own" rule with a readable message. */
export function validateRentalQuantity(
  quantity: number,
  material: Pick<Material, "name" | "availableStock" | "unit" | "isActive">,
  alreadyOnThisRental = 0,
): QuantityValidation {
  if (!material.isActive) {
    return { ok: false, message: `${material.name} is deactivated and cannot be rented.` };
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, message: "Enter a quantity of 1 or more." };
  }
  if (!Number.isInteger(quantity)) {
    return { ok: false, message: "Quantity must be a whole number." };
  }
  const requested = quantity + alreadyOnThisRental;
  if (requested > material.availableStock) {
    return {
      ok: false,
      message: `Only ${material.availableStock} ${material.unit}${
        material.availableStock === 1 ? "" : "s"
      } of ${material.name} available.`,
    };
  }
  return { ok: true };
}

export function validateReturnQuantity(
  quantity: number,
  remaining: number,
  materialName: string,
): QuantityValidation {
  if (quantity < 0) return { ok: false, message: "Return quantity cannot be negative." };
  if (!Number.isInteger(quantity)) return { ok: false, message: "Use whole numbers only." };
  if (quantity > remaining) {
    return { ok: false, message: `Only ${remaining} of ${materialName} are still out.` };
  }
  return { ok: true };
}

/**
 * Builds the printable invoice lines for a rental.
 *
 * The prototype bills every line for the rental's full duration (issue date →
 * actual/expected return date) using the rate locked onto the line. Per-item
 * return dates are deliberately isolated here: when the shop wants true partial
 * billing, only this function changes.
 */
export function buildInvoiceLines(
  rental: Rental,
  returnDate: string | Date,
  options: DayCountOptions = {},
): InvoiceLine[] {
  const days = calculateRentalDays(rental.issueDate, returnDate, options);
  return rental.items.map((item) => ({
    materialName: item.materialName,
    quantity: item.quantity,
    unit: item.unit,
    dailyRate: item.dailyRate,
    days,
    amount: calculateTotalRent(item.quantity, item.dailyRate, days),
  }));
}

export type InvoiceTotals = {
  subtotal: number;
  damageCharges: number;
  additionalCharges: number;
  discount: number;
  totalAmount: number;
};

export function calculateInvoiceTotal(input: {
  lines: InvoiceLine[];
  damageCharges?: number;
  additionalCharges?: number;
  discount?: number;
}): InvoiceTotals {
  const subtotal = input.lines.reduce((sum, line) => sum + line.amount, 0);
  const damageCharges = input.damageCharges ?? 0;
  const additionalCharges = input.additionalCharges ?? 0;
  const discount = input.discount ?? 0;
  return {
    subtotal,
    damageCharges,
    additionalCharges,
    discount,
    totalAmount: Math.max(0, subtotal + damageCharges + additionalCharges - discount),
  };
}

export function balanceDue(invoice: Invoice): number {
  return Math.max(0, invoice.totalAmount - invoice.paidAmount);
}

export function paymentStatusFor(totalAmount: number, paidAmount: number) {
  if (paidAmount <= 0) return "pending" as const;
  if (paidAmount >= totalAmount) return "paid" as const;
  return "partial" as const;
}

/**
 * A rental is overdue only when an expected return date was agreed and has
 * passed. An open-ended rental that has been out for weeks is still just active.
 */
export function isOverdue(rental: Rental, today: Date = new Date()): boolean {
  if (rental.status !== "active" && rental.status !== "overdue") return false;
  if (!rental.expectedReturnDate) return false;
  return differenceInCalendarDays(today, toDate(rental.expectedReturnDate)) > 0;
}

export function effectiveStatus(rental: Rental, today: Date = new Date()) {
  if (rental.status === "active" && isOverdue(rental, today)) return "overdue" as const;
  return rental.status;
}

export function daysOverdue(rental: Rental, today: Date = new Date()): number {
  if (!rental.expectedReturnDate) return 0;
  return Math.max(0, differenceInCalendarDays(today, toDate(rental.expectedReturnDate)));
}

/** Days a rental has been running: to today while active, to return date once closed. */
export function rentalDurationSoFar(rental: Rental, options: DayCountOptions = {}): number {
  const end = rental.actualReturnDate ? toDate(rental.actualReturnDate) : new Date();
  return calculateRentalDays(rental.issueDate, end, options);
}

/** What the bill would come to if the customer walked in right now. */
export function runningRentEstimate(rental: Rental, options: DayCountOptions = {}): number {
  const days = rentalDurationSoFar(rental, options);
  return rental.items.reduce(
    (sum, item) => sum + calculateTotalRent(item.quantity, item.dailyRate, days),
    0,
  );
}
