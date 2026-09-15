"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Monitor, Moon, RotateCcw, Sun, X } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { usePageMeta, PageIntro } from "@/components/layout/app-shell";
import { settingsSchema, type SettingsFormValues } from "@/lib/validations";
import { calculateRentalDays } from "@/lib/calculations";
import { formatDays } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  usePageMeta("Settings", [{ label: "Settings" }]);
  const { state, updateSettings, resetData } = useAppStore();
  const { toast } = useToast();
  const [resetOpen, setResetOpen] = React.useState(false);
  const [newCategory, setNewCategory] = React.useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    values: {
      shopName: state.settings.shopName,
      address: state.settings.address,
      phone: state.settings.phone,
      gstNumber: state.settings.gstNumber ?? "",
      invoicePrefix: state.settings.invoicePrefix,
      invoiceNotes: state.settings.invoiceNotes,
    },
  });

  const onSubmit = handleSubmit((values) => {
    updateSettings(values);
    reset(values);
    toast({ title: "Shop details saved" });
  });

  // Live example so the day-count convention is unambiguous.
  const sampleDays = calculateRentalDays("2026-09-14", "2026-09-19", {
    convention: state.settings.dayCountConvention,
    minimumBillableDays: state.settings.minimumBillableDays,
  });

  const addCategory = () => {
    const value = newCategory.trim();
    if (!value || state.settings.categories.includes(value)) return;
    updateSettings({ categories: [...state.settings.categories, value] });
    setNewCategory("");
    toast({ title: `${value} added to categories` });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageIntro description="Shop details, how rental days are counted, and how the app looks." />

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Shop details</CardTitle>
              <CardDescription>Printed at the top of every invoice.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <Field label="Shop name" htmlFor="shopName" required error={errors.shopName?.message}>
                <Input id="shopName" {...register("shopName")} />
              </Field>
              <Field label="Address" htmlFor="address" required error={errors.address?.message}>
                <Textarea id="address" rows={2} {...register("address")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Phone" htmlFor="phone" required error={errors.phone?.message}>
                  <Input id="phone" className="tabular" {...register("phone")} />
                </Field>
                <Field label="GST number" htmlFor="gst" error={errors.gstNumber?.message}>
                  <Input id="gst" className="tabular" {...register("gstNumber")} />
                </Field>
              </div>
              <Field
                label="Invoice prefix"
                htmlFor="prefix"
                required
                error={errors.invoicePrefix?.message}
                hint={`Bills are numbered ${state.settings.invoicePrefix}-0001, ${state.settings.invoicePrefix}-0002 and so on.`}
              >
                <Input id="prefix" className="tabular w-32" {...register("invoicePrefix")} />
              </Field>
              <Field label="Invoice footer note" htmlFor="invoiceNotes" error={errors.invoiceNotes?.message}>
                <Textarea id="invoiceNotes" rows={3} {...register("invoiceNotes")} />
              </Field>
              <Button type="submit" variant="primary" disabled={!isDirty}>
                Save shop details
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Billing</CardTitle>
              <CardDescription>How rent is worked out when material comes back.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Rental day convention"
              htmlFor="convention"
              hint={`A rental issued 14 Sep and returned 19 Sep is billed as ${formatDays(sampleDays)}.`}
            >
              <Select
                id="convention"
                value={state.settings.dayCountConvention}
                onChange={(event) =>
                  updateSettings({
                    dayCountConvention: event.target.value as "exclusive" | "inclusive",
                  })
                }
              >
                <option value="exclusive">Return date minus issue date</option>
                <option value="inclusive">Count the issue day as well</option>
              </Select>
            </Field>

            <Field
              label="Minimum billable days"
              htmlFor="minDays"
              hint="Applies when material comes back the same day it went out."
            >
              <Input
                id="minDays"
                type="number"
                min={0}
                max={5}
                className="tabular w-28"
                value={state.settings.minimumBillableDays}
                onChange={(event) =>
                  updateSettings({ minimumBillableDays: Number(event.target.value) || 0 })
                }
              />
            </Field>

            <Field
              label="Default payment status on a new bill"
              htmlFor="paymentStatus"
              hint="Set to paid if customers usually settle at the counter."
            >
              <Select
                id="paymentStatus"
                value={state.settings.defaultPaymentStatus}
                onChange={(event) =>
                  updateSettings({
                    defaultPaymentStatus: event.target.value as "paid" | "pending",
                  })
                }
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </Select>
            </Field>

            <div className="rounded-md bg-surface-muted p-3 text-[12.5px] leading-relaxed text-ink-muted">
              Currency is fixed to Indian rupees. Changing the day convention affects bills raised
              from now on; bills already issued keep the figures they were raised with.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Material categories</CardTitle>
              <CardDescription>Used when adding or filtering materials.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {state.settings.categories.map((category) => (
                <Badge key={category} tone="neutral" className="pr-1">
                  {category}
                  <button
                    onClick={() =>
                      updateSettings({
                        categories: state.settings.categories.filter((item) => item !== category),
                      })
                    }
                    className="rounded-full p-0.5 hover:bg-line"
                    aria-label={`Remove ${category}`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(event) => setNewCategory(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && addCategory()}
                placeholder="Add a category"
                className="max-w-xs"
              />
              <Button variant="secondary" onClick={addCategory}>
                Add
              </Button>
            </div>
            <p className="text-[12.5px] text-ink-muted">
              Units available to materials: piece, set, bundle and other.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Applies to this device only.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "light", label: "Light", icon: Sun },
                  { value: "dark", label: "Dark", icon: Moon },
                  { value: "system", label: "Match device", icon: Monitor },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateSettings({ theme: option.value })}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3 py-2 text-[13px] font-medium transition-colors",
                    state.settings.theme === option.value
                      ? "border-brand bg-brand-soft text-brand-ink"
                      : "border-line-strong text-ink-soft hover:bg-surface-muted",
                  )}
                >
                  <option.icon className="size-4" />
                  {option.label}
                </button>
              ))}
            </div>
            <Switch
              checked={state.settings.sidebarCollapsed}
              onChange={(value) => updateSettings({ sidebarCollapsed: value })}
              label="Keep the sidebar collapsed"
              description="More room for tables on smaller laptop screens."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Prototype data</CardTitle>
              <CardDescription>
                This build keeps everything in the browser. Resetting restores the sample shop.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outlineDanger" onClick={() => setResetOpen(true)}>
              <RotateCcw />
              Reset all data
            </Button>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          resetData();
          toast({ title: "Sample data restored", tone: "info" });
        }}
        title="Reset all data?"
        message="Every customer, material, rental and bill you added in this browser will be replaced with the original sample data."
        confirmLabel="Reset data"
      />
    </div>
  );
}
