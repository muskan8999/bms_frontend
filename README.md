# BuildRent — Building Material Rental Management System

An admin dashboard for a building material rental shop in Punjab, India. The shop issues
Fatte (ਫੱਟੇ), Ghodi (ਘੋੜੀ), shuttering plates, props and beams by quantity, charges rent per
day, and only knows the final bill on the day the material comes back.

Frontend-only prototype. All data lives in mock records held in React state and mirrored to
`localStorage`, so the whole workflow is usable end to end without a backend.

---

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # production build
npm start        # serve the production build
npm run typecheck
```

Requires Node 20 or newer.

---

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript, strict |
| Styling | Tailwind CSS v4 with a CSS-variable token layer |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Dates | date-fns |
| Icons | Lucide React |
| UI components | Hand-built primitives in `src/components/ui`, shadcn-style API (Button, Card, Dialog, Combobox, Tabs, Table, Toast, Switch, Badge…) with no Radix dependency, so nothing needs generating via CLI |

Tables are custom (sortable headers, pagination, row menus) rather than TanStack Table — the
column sets here are fixed and small, and the custom shell keeps the bundle and the markup
simpler. Swapping in TanStack later only touches `components/ui/table.tsx` and the three
table components.

---

## The business rules, and where they live

Every rule from the brief is enforced in one place so it can't drift:

**1. No rental duration at creation.** `/rentals/new` asks for customer, materials, quantity,
issue date and an optional expected return date. Nothing about days.

**2. The actual return date decides the bill.** `calculateRentalDays()` in
`src/lib/calculations.ts` is the only function in the app that counts days. It reads the
convention from Settings:

```ts
calculateRentalDays("2026-09-14", "2026-09-19")                         // 5
calculateRentalDays("2026-09-14", "2026-09-19", { convention: "inclusive" }) // 6
```

`BILLING_DEFAULTS` also carries `minimumBillableDays` (default 1) so a same-day return still
bills one day. Change the convention in Settings → Billing and every figure in the app follows.

**3. Admin-managed daily rates.** Materials hold the current `dailyRate`. The rental form
loads it automatically; the rate is never typed by hand when issuing.

**4. Locked rates.** `createRental()` copies the material's rate onto each `RentalItem` as a
snapshot. Bills read `item.dailyRate`, never `material.dailyRate`. Change Fatte from ₹10 to
₹15 and REN-1001 still bills at ₹10 — the material details dialog shows the rate-change trail
and flags where a rental's locked rate differs from today's.

**5. Quantity-based lines.** One line per material with a quantity. Ten Fatte is one row.

**6. Partial returns.** `/rentals/[id]/return` takes a quantity per material, defaulting to
everything still out. Returning some keeps the rental active, adds a `ReturnRecord`, puts that
stock back on the shelf, and raises no bill. The bill is raised only when the last piece is back.

**7. Stock.** `availableStock` is recomputed from live rentals after every mutation
(`reconcileStock` / `rentedQuantityForMaterial`), so it can never drift out of sync. Materials
that are out of stock or deactivated can't be added to a rental, and the quantity field
validates against live availability with a readable message.

**Overdue** is deliberately narrow: a rental is overdue only when an expected return date was
agreed *and* has passed. An open-ended rental that has been out for three weeks is still just
active.

---

## Screens

| Route | What it does |
| --- | --- |
| `/dashboard` | Six summary cards, rent accrued over 7 days, rental activity, most-rented materials, recent rentals |
| `/rentals` | Tabs for all / active / overdue / returned / draft, search, live day counts |
| `/rentals/new` | The core workflow — searchable customer and material pickers, inline quantities, live daily total, create or save as draft |
| `/rentals/[id]` | Locked rates per line, running rent estimate, returns recorded, timeline, edit and cancel |
| `/rentals/[id]/return` | Partial or full return, damage/extra charges, discount, live bill preview |
| `/customers`, `/customers/[id]` | List with pending amounts; profile with rentals, bills and totals |
| `/materials` | Stock, rates, rate updates with the "new rentals only" confirmation, details dialog with rate history |
| `/bills` | Invoice list by payment status, printable invoice, mark paid, record part payment |
| `/history` | Filter by status, date range and search; CSV export |
| `/reports` | Today / week / month / custom range, revenue and activity charts, customer activity |
| `/settings` | Shop details, day-count convention, categories, theme, reset data |

Printing a bill uses CSS print rules in `globals.css` — the invoice becomes the page and
everything else is hidden.

---

## Project structure

```
src/
  app/                 routes (App Router, one folder per screen)
  components/
    layout/            sidebar, mobile drawer, header, app shell, theme
    ui/                button, card, dialog, combobox, table, tabs, toast, …
    dashboard/         stat cards and charts
    rentals/           rental table, customer/material selectors, timeline
    customers/         customer form
    materials/         material form, material details
    billing/           printable invoice
  lib/
    calculations.ts    days, rent, stock, invoice totals, overdue  ← all pricing logic
    analytics.ts       dashboard and report aggregations
    formatters.ts      INR, dates, pluralisation
    validations.ts     Zod schemas
    mock-data.ts       the seeded shop
  store/
    app-store.tsx      every mutation in the app
  types/index.ts       domain models
```

No pricing arithmetic lives inside a component. Components call `calculateDailyRent`,
`calculateTotalRent`, `calculateRentalDays`, `buildInvoiceLines` and `calculateInvoiceTotal`.

---

## Wiring a backend later

`src/store/app-store.tsx` is the seam. It exposes actions (`createRental`, `recordReturn`,
`updateMaterial`, `recordPayment`, …) and selectors (`rentalById`, `invoiceForRental`, …).
Replace each action body with a fetch call — or drop in TanStack Query — and no page or
component needs to change. The types in `src/types` are shaped like API responses, and ids
(`REN-1001`, `CUS-0001`, `INV-0001`) are generated the way a server would.

Partial billing is isolated too: `buildInvoiceLines()` currently bills every line for the
rental's full duration. Per-item return dates only require changing that one function.

---

## Trying the full workflow

1. **Materials** → add or check Fatte (₹10/day) and Ghodi (₹20/day).
2. **Customers** → add Raj Kumar, 9876543210.
3. **New rental** → pick Raj Kumar, add 10 Fatte and 5 Ghodi. The summary shows **₹200/day**
   and "final rent will be calculated on return". Create it.
4. **Materials** → available stock has dropped by 10 and 5.
5. Open the rental → **Record a return**, set the return date five days after the issue date.
   The preview shows 10 × ₹10 × 5 = ₹500, 5 × ₹20 × 5 = ₹500, **₹1,000**.
6. Save. The rental closes, the bill is raised, stock goes back, and the rental appears in
   history.
7. Go back to **Materials**, change Fatte to ₹15/day, then reopen the old rental — it still
   bills at ₹10. A new rental picks up ₹15.

For a partial return, open REN-1002: 25 of its 60 shuttering plates are already back.

Settings → Reset all data restores the sample shop at any point.

---

## Notes

- Data is per-browser. Clearing site data resets the shop.
- Fonts load from Google Fonts (IBM Plex Sans and Mono); the app falls back to system fonts
  offline.
- Authentication, payments and PDF generation are intentionally out of scope. The "Download
  PDF" button says so rather than pretending; printing to PDF works today.
