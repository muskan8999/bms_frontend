import { format, formatDistanceToNowStrict, parseISO } from "date-fns";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹1,000 — the shop deals in whole rupees, so decimals are hidden by default. */
export function formatCurrency(value: number | string | null | undefined, precise = false) {
  const numericValue = typeof value === "string" && value.trim() === ""
      ? NaN
      : Number(value);
  if (!Number.isFinite(numericValue)) {
    return "₹0";
  }
  return precise
    ? inrPrecise.format(numericValue)
    : inr.format(numericValue);
}
export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function toDate(value: string | Date) {
  return typeof value === "string" ? parseISO(value) : value;
}

/** 14 Sep 2026 */
export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  return format(toDate(value), "dd MMM yyyy");
}

/** 14 Sep 2026, 4:30 pm */
export function formatDateTime(value?: string | Date | null) {
  if (!value) return "—";
  return format(toDate(value), "dd MMM yyyy, h:mm a");
}

/** Value for an <input type="date"> */
export function toInputDate(value: string | Date) {
  return format(toDate(value), "yyyy-MM-dd");
}

export function todayInput() {
  return format(new Date(), "yyyy-MM-dd");
}

export function relativeTime(value?: string | Date | null) {
  if (!value) return "—";
  return `${formatDistanceToNowStrict(toDate(value))} ago`;
}

export function pluralise(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

export function formatDays(days: number) {
  return `${days} ${pluralise(days, "day")}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
