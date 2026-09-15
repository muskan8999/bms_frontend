"use client";

import type { Invoice } from "@/types";
import { useAppStore } from "@/store/app-store";
import { balanceDue } from "@/lib/calculations";
import { formatCurrency, formatDate, formatDays } from "@/lib/formatters";
import { PaymentBadge } from "@/components/ui/status-badge";

/**
 * Laid out to survive printing: plain table, no colour dependency, and the
 * `print-area` class means everything else on the page is hidden on paper.
 */
export function InvoicePreview({ invoice }: { invoice: Invoice }) {
  const { state, customerById, rentalById } = useAppStore();
  const customer = customerById(invoice.customerId);
  const rental = rentalById(invoice.rentalId);
  const shop = state.settings;

  const lines =
    rental?.items.map((item) => ({
      materialName: item.materialName,
      quantity: item.quantity,
      unit: item.unit,
      dailyRate: item.dailyRate,
      days: invoice.totalDays,
      amount: item.quantity * item.dailyRate * invoice.totalDays,
    })) ?? [];

  return (
    <div className="print-area rounded-card border border-line bg-surface p-6 sm:p-8">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-5">
        <div className="max-w-xs">
          <p className="text-[18px] font-bold tracking-tight text-ink">{shop.shopName}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{shop.address}</p>
          <p className="tabular mt-1 text-[12.5px] text-ink-muted">{shop.phone}</p>
          {shop.gstNumber ? (
            <p className="tabular mt-0.5 text-[12.5px] text-ink-muted">GSTIN {shop.gstNumber}</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-[13px] font-semibold text-ink-soft">Rental invoice</p>
          <p className="tabular mt-1 text-[20px] font-bold text-ink">{invoice.id}</p>
          <p className="tabular mt-1 text-[12.5px] text-ink-muted">
            Raised {formatDate(invoice.createdAt)}
          </p>
          <div className="mt-2 flex justify-end">
            <PaymentBadge status={invoice.status} />
          </div>
        </div>
      </header>

      <section className="grid gap-6 py-5 sm:grid-cols-2">
        <div>
          <p className="text-[12px] font-semibold text-ink-muted">Billed to</p>
          <p className="mt-1.5 text-[14px] font-semibold text-ink">
            {customer?.name ?? "Deleted customer"}
          </p>
          <p className="tabular text-[12.5px] text-ink-muted">{customer?.phone}</p>
          {customer?.address ? (
            <p className="mt-0.5 max-w-[16rem] text-[12.5px] leading-relaxed text-ink-muted">
              {customer.address}
            </p>
          ) : null}
        </div>
        <div className="sm:text-right">
          <p className="text-[12px] font-semibold text-ink-muted">Rental period</p>
          <p className="tabular mt-1.5 text-[13px] text-ink">
            {formatDate(invoice.issueDate)} → {formatDate(invoice.returnDate)}
          </p>
          <p className="tabular text-[12.5px] text-ink-muted">
            {formatDays(invoice.totalDays)} · rental {invoice.rentalId}
          </p>
        </div>
      </section>

      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-y border-line">
            <th className="py-2 text-left font-semibold text-ink-muted">Material</th>
            <th className="py-2 text-right font-semibold text-ink-muted">Qty</th>
            <th className="py-2 text-right font-semibold text-ink-muted">Rate / day</th>
            <th className="py-2 text-right font-semibold text-ink-muted">Days</th>
            <th className="py-2 text-right font-semibold text-ink-muted">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.materialName} className="border-b border-line">
              <td className="py-2.5 text-ink">{line.materialName}</td>
              <td className="tabular py-2.5 text-right text-ink-soft">{line.quantity}</td>
              <td className="tabular py-2.5 text-right text-ink-soft">
                {formatCurrency(line.dailyRate)}
              </td>
              <td className="tabular py-2.5 text-right text-ink-soft">{line.days}</td>
              <td className="tabular py-2.5 text-right font-medium text-ink">
                {formatCurrency(line.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-5 flex justify-end">
        <dl className="w-full max-w-xs space-y-1.5 text-[13px]">
          <Row label="Subtotal" value={formatCurrency(invoice.subtotal)} />
          {invoice.damageCharges ? (
            <Row label="Damage charges" value={formatCurrency(invoice.damageCharges)} />
          ) : null}
          {invoice.additionalCharges ? (
            <Row label="Additional charges" value={formatCurrency(invoice.additionalCharges)} />
          ) : null}
          {invoice.discount ? (
            <Row label="Discount" value={`− ${formatCurrency(invoice.discount)}`} />
          ) : null}
          <div className="flex items-baseline justify-between border-t border-line pt-2">
            <dt className="text-[14px] font-semibold text-ink">Grand total</dt>
            <dd className="tabular text-[18px] font-bold text-ink">
              {formatCurrency(invoice.totalAmount)}
            </dd>
          </div>
          <Row label="Paid" value={formatCurrency(invoice.paidAmount)} />
          <Row label="Balance due" value={formatCurrency(balanceDue(invoice))} strong />
        </dl>
      </div>

      {invoice.notes ? (
        <p className="mt-5 border-t border-line pt-4 text-[12.5px] leading-relaxed text-ink-muted">
          {invoice.notes}
        </p>
      ) : null}

      <p className="mt-4 text-[11.5px] leading-relaxed text-ink-muted">{shop.invoiceNotes}</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-muted">{label}</dt>
      <dd className={`tabular ${strong ? "font-semibold text-ink" : "text-ink-soft"}`}>{value}</dd>
    </div>
  );
}
