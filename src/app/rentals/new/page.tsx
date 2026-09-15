"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";


import { PageIntro, usePageMeta } from "@/components/layout/app-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { callApi } from "@/service/ApiService";
import { Customer, CustomersListApiResponse, Material, MaterialsListApiResponse, RentalCreateApiResponse } from "@/types";



type RentalItem = {
  materialId: string;
  materialName: string;
  quantity: number;
  availableUnits: number;
  dailyRentalRate: number;
};

export default function NewRentalPage() {
  usePageMeta("New rental", [
    { label: "Rentals", href: "/rentals" },
    { label: "New rental" },
  ]);

  const router = useRouter();
  const { toast } = useToast();

  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [materials, setMaterials] = React.useState<Material[]>([]);
  const [items, setItems] = React.useState<RentalItem[]>([]);

  const [customerId, setCustomerId] = React.useState("");
  const [materialId, setMaterialId] = React.useState("");
  const [quantity, setQuantity] = React.useState("");

  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const selectedCustomer = customers.find(
    (customer) => customer.id === customerId,
  );

  const selectedMaterial = materials.find(
    (material) => material.id === materialId,
  );

  const totalQuantity = items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  const totalDailyRental = items.reduce(
    (total, item) =>
      total + item.quantity * Number(item.dailyRentalRate),
    0,
  );

  // =====================================
  // FETCH CUSTOMERS AND MATERIALS
  // =====================================

  React.useEffect(() => {
    const fetchRentalData = async () => {
      try {
        setLoading(true);

        const [customersResponse, materialsResponse] =
          await Promise.all([
            callApi<CustomersListApiResponse>({
              method: "GET",
              url: "/customers/all",
            }),

            callApi<MaterialsListApiResponse>({
              method: "GET",
              url: "/materials/getAll",
            }),
          ]);
        setCustomers(customersResponse?.result?.customers || []);
        setMaterials(materialsResponse?.materialData?.materials || []);
      } catch (error) {
        console.error("Failed to fetch rental data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRentalData();
  }, []);



  const handleAddMaterial = () => {
    if (!selectedMaterial) {
      toast({
        title: "Material required",
        description: "Please select a material.",
        tone: "error",
      });
      return;
    }

    const parsedQuantity = Number(quantity);

    if (!parsedQuantity || parsedQuantity <= 0) {
      toast({
        title: "Invalid quantity",
        description: "Quantity must be greater than zero.",
        tone: "error",
      });

      return;
    }

    if (parsedQuantity > selectedMaterial.availableUnits) {
      toast({
        title: "Insufficient stock",
        description: `Only ${selectedMaterial.availableUnits} units are available.`,
        tone: "error",
      });

      return;
    }

    const materialAlreadyAdded = items.some(
      (item) => item.materialId === selectedMaterial.id,
    );

    if (materialAlreadyAdded) {
      toast({
        title: "Material already added",
        description: "This material is already added.",
        tone: "error",
      });

      return;
    }

    const newItem: RentalItem = {
      materialId: selectedMaterial.id,
      materialName: selectedMaterial.name,
      quantity: parsedQuantity,
      availableUnits: selectedMaterial.availableUnits,
      dailyRentalRate: selectedMaterial.dailyRentalRate,
    };

    setItems((currentItems) => [...currentItems, newItem]);

    setMaterialId("");
    setQuantity("");
  };


  const handleQuantityChange = (
    materialIdToUpdate: string,
    newQuantity: number,
  ) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.materialId === materialIdToUpdate
          ? {
              ...item,
              quantity: newQuantity,
            }
          : item,
      ),
    );
  };

  // =====================================
  // REMOVE MATERIAL
  // =====================================

  const handleRemoveMaterial = (materialIdToRemove: string) => {
    setItems((currentItems) =>
      currentItems.filter(
        (item) => item.materialId !== materialIdToRemove,
      ),
    );
  };

  // =====================================
  // CREATE RENTAL
  // =====================================

  const handleCreateRental = async () => {
    if (!customerId) {
      toast({
        title: "Customer required",
        description: "Please select a customer.",
        tone: "error",
      });

      return;
    }

    if (items.length === 0) {
      toast({
        title: "Material required",
        description: "Please add at least one material.",
        tone: "error",
      });

      return;
    }

    if (!startDate) {
      toast({
        title: "Start date required",
        description: "Please select the start date.",
        tone: "error",
      });

      return;
    }

    if (endDate && new Date(endDate) < new Date(startDate)) {
      toast({
        title: "Invalid end date",
        description: "End date cannot be before start date.",
        tone: "error",
      });

      return;
    }

    try {
      setSaving(true);

      /*
       * Current backend API accepts one material per request.
       * Therefore, we create one rental request for every selected item.
       */

      await Promise.all(
        items.map((item) =>
          callApi<RentalCreateApiResponse>({
            method: "POST",
            url: "/rentals/create",
            data: {
              customerId,
              materialId: item.materialId,
              quantity: item.quantity,
              startDate,
              endDate: endDate || undefined,
              notes: notes || undefined,
            },
          }),
        ),
      );

      toast({
        title: "Rental created",
        description: "Rental created successfully.",
        tone: "success",
      });

      router.push("/rentals");
    } catch (error) {
      console.error("Failed to create rental:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <PageIntro
        description="Select a customer, add rental materials, and create the rental."
        actions={
          <Button
            variant="secondary"
            onClick={() => router.push("/rentals")}
          >
            <ArrowLeft />
            Back to rentals
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          {/* CUSTOMER */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
              <CardDescription>
                Select the customer for this rental.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <Field label="Customer" required>
                <select
                  value={customerId}
                  onChange={(event) =>
                    setCustomerId(event.target.value)
                  }
                  disabled={loading}
                  className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-brand"
                >
                  <option value="">
                    {loading
                      ? "Loading customers..."
                      : "Select customer"}
                  </option>

                  {customers?.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.phone
                        ? ` - ${customer.phone}`
                        : ""}
                    </option>
                  ))}
                </select>
              </Field>

              {selectedCustomer && (
                <div className="rounded-md border border-brand/25 bg-brand-soft p-3 text-sm">
                  <p className="font-semibold text-brand-ink">
                    {selectedCustomer.name}
                  </p>

                  {selectedCustomer.phone && (
                    <p className="text-brand-ink/80">
                      {selectedCustomer.phone}
                    </p>
                  )}

                  {selectedCustomer.address && (
                    <p className="text-brand-ink/80">
                      {selectedCustomer.address}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* MATERIAL */}
          <Card>
            <CardHeader>
              <CardTitle>Material</CardTitle>
              <CardDescription>
                Select material, enter quantity, and click Add.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
                <Field label="Material" required>
                  <select
                    value={materialId}
                    onChange={(event) =>
                      setMaterialId(event.target.value)
                    }
                    disabled={loading}
                    className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-brand"
                  >
                    <option value="">
                      {loading
                        ? "Loading materials..."
                        : "Select material"}
                    </option>

                    {materials.filter(
                        (material) =>
                          material.isActive !== false && !items.some(
                            (item) =>item.materialId === material.id,
                          ),
                      )
                      .map((material) => (
                        <option
                          key={material.id}
                          value={material.id}
                          disabled={material.availableUnits <= 0}
                        >
                          {material?.name} -{" "}
                          {material?.availableUnits} available
                        </option>
                      ))}
                  </select>
                </Field>

                <Field label="Quantity" required>
                  <Input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(event.target.value)
                    }
                    placeholder="0"
                  />
                </Field>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddMaterial}
                  className="h-10"
                >
                  <Plus />
                  Add
                </Button>
              </div>

              {selectedMaterial && (
                <div className="rounded-md bg-surface-muted px-3 py-3 text-sm">
                  <div className="flex flex-wrap gap-4">
                    <span className="font-semibold">
                      {selectedMaterial.name}
                    </span>

                    <span>
                      Available: {selectedMaterial.availableUnits}
                    </span>

                    <span>
                      Rate: ₹{selectedMaterial.dailyRentalRate}/day
                    </span>
                  </div>
                </div>
              )}

              {/* SELECTED MATERIALS TABLE */}
              <div className="overflow-x-auto rounded-md border border-line">
                {items.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-ink-muted">
                    No material added yet.
                  </div>
                ) : (
                  <table className="w-full min-w-[650px] text-sm">
                    <thead className="border-b border-line bg-surface-muted">
                      <tr>
                        <th className="px-4 py-3 text-left">
                          Material
                        </th>

                        <th className="px-4 py-3 text-right">
                          Quantity
                        </th>

                        <th className="px-4 py-3 text-right">
                          Rate / day
                        </th>

                        <th className="px-4 py-3 text-right">
                          Daily total
                        </th>

                        <th className="px-4 py-3 text-right">
                          Action
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((item) => (
                        <tr
                          key={item.materialId}
                          className="border-b border-line last:border-b-0"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium">
                              {item.materialName}
                            </p>

                            <p className="text-xs text-ink-muted">
                              {item.availableUnits} available
                            </p>
                          </td>

                          <td className="px-4 py-3 text-right">
                            <Input
                              type="number"
                              min={1}
                              max={item.availableUnits}
                              value={item.quantity}
                              onChange={(event) =>
                                handleQuantityChange(
                                  item.materialId,
                                  Number(event.target.value),
                                )
                              }
                              className="ml-auto h-9 w-24 text-right"
                            />
                          </td>

                          <td className="px-4 py-3 text-right">
                            ₹{item.dailyRentalRate}
                          </td>

                          <td className="px-4 py-3 text-right font-semibold">
                            ₹
                            {item.quantity *
                              Number(item.dailyRentalRate)}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="iconSm"
                              onClick={() =>
                                handleRemoveMaterial(item.materialId)
                              }
                              aria-label={`Remove ${item.materialName}`}
                            >
                              <Trash2 />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>

          {/* DATES AND NOTES */}
          <Card>
            <CardHeader>
              <CardTitle>Dates and notes</CardTitle>
              <CardDescription>
                End date is optional.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Start date" required>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(event) =>
                      setStartDate(event.target.value)
                    }
                  />
                </Field>

                <Field label="End date">
                  <Input
                    type="date"
                    min={startDate || undefined}
                    value={endDate}
                    onChange={(event) =>
                      setEndDate(event.target.value)
                    }
                  />
                </Field>
              </div>

              <Field label="Notes">
                <Textarea
                  rows={4}
                  value={notes}
                  onChange={(event) =>
                    setNotes(event.target.value)
                  }
                  placeholder="Enter rental notes..."
                />
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* SUMMARY */}
        <div className="xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardHeader>
              <CardTitle>Rental summary</CardTitle>
              <CardDescription>
                Check details before creating the rental.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              <SummaryRow
                label="Customer"
                value={selectedCustomer?.name || "Not selected"}
              />

              <SummaryRow
                label="Material types"
                value={String(items.length)}
              />

              <SummaryRow
                label="Total quantity"
                value={String(totalQuantity)}
              />

              <SummaryRow
                label="Start date"
                value={startDate || "Not selected"}
              />

              <SummaryRow
                label="End date"
                value={endDate || "Open ended"}
              />

              <div className="flex items-center justify-between border-t border-line pt-3">
                <span className="text-sm text-ink-muted">
                  Status
                </span>

                <Badge tone="brand">Active</Badge>
              </div>

              <div className="rounded-md bg-brand-soft px-3 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-brand-ink">
                    Daily rental
                  </span>

                  <span className="text-xl font-semibold text-brand-ink">
                    ₹{totalDailyRental}
                  </span>
                </div>
              </div>

              <Button
                variant="primary"
                onClick={handleCreateRental}
                disabled={saving || loading}
                className="w-full"
              >
                {saving ? "Creating rental..." : "Create rental"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-ink-muted">{label}</span>

      <span className="text-right text-sm font-medium">
        {value}
      </span>
    </div>
  );
}