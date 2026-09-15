"use client";

import * as React from "react";
import Link from "next/link";
import { Check, MapPin, Phone, UserPlus, X } from "lucide-react";
import type { Customer } from "@/types";
import { useAppStore } from "@/store/app-store";
import { initials } from "@/lib/formatters";
import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { CustomerFormDialog } from "@/components/customers/customer-form";

export function CustomerSelector({
  value,
  onChange,
  error,
}: {
  value?: string;
  onChange: (customerId: string | undefined) => void;
  error?: string;
}) {
  const { state } = useAppStore();
  const [addOpen, setAddOpen] = React.useState(false);

  const selected = state.customers.find((customer) => customer.id === value);

  const options = React.useMemo(
    () =>
      state.customers.map((customer) => ({
        value: customer.id,
        label: customer.name,
        hint: `${customer.phone}${customer.address ? ` · ${customer.address}` : ""}`,
        keywords: customer.id,
      })),
    [state.customers],
  );

  return (
    <div className="space-y-3">
      <Field
        label="Customer"
        required
        error={error}
        hint={selected ? undefined : "Search by name or mobile number."}
      >
        <Combobox
          options={options}
          value={value}
          onChange={onChange}
          placeholder="Search customer"
          searchPlaceholder="Name or mobile number"
          emptyMessage="No customer with that name or number."
          invalid={Boolean(error)}
          footer={(_query, close) => (
            <button
              type="button"
              onClick={() => {
                close();
                setAddOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] font-medium text-brand hover:bg-brand-soft"
            >
              <UserPlus className="size-4" />
              Add a new customer
            </button>
          )}
        />
      </Field>

      {selected ? <SelectedCustomer customer={selected} onClear={() => onChange(undefined)} /> : null}

      <CustomerFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={(customer) => onChange(customer.id)}
      />
    </div>
  );
}

function SelectedCustomer({ customer, onClear }: { customer: Customer; onClear: () => void }) {
  return (
    <div className="animate-pop flex items-start gap-3 rounded-md border border-brand/25 bg-brand-soft p-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-[12px] font-semibold text-brand-ink">
        {initials(customer.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-brand-ink">
          <Check className="size-3.5" />
          {customer.name}
        </p>
        <p className="tabular mt-1 flex items-center gap-1.5 text-[12.5px] text-brand-ink/80">
          <Phone className="size-3.5" />
          {customer.phone}
        </p>
        {customer.address ? (
          <p className="mt-0.5 flex items-start gap-1.5 text-[12.5px] text-brand-ink/80">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            {customer.address}
          </p>
        ) : null}
        <Link
          href={`/customers/${customer.id}`}
          className="mt-2 inline-block text-[12.5px] font-medium text-brand-ink underline underline-offset-2"
        >
          Open profile
        </Link>
      </div>
      <Button variant="ghost" size="iconSm" onClick={onClear} aria-label="Clear customer">
        <X />
      </Button>
    </div>
  );
}
