"use client";

import * as React from "react";
import {
  Boxes,
  Eye,
  IndianRupee,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
} from "lucide-react";

import type {
  DeleteMaterialApiResponse,
  Material,
  MaterialApiResponse,
  MaterialsListApiResponse,
} from "@/types";

import { usePageMeta, PageIntro } from "@/components/layout/app-shell";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableShell, Td, Th, Tr } from "@/components/ui/table";
import { RowMenu } from "@/components/ui/menu";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ConfirmDialog,
  Dialog,
} from "@/components/ui/dialog";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Field } from "@/components/ui/field";
import { MaterialFormDialog } from "@/components/materials/material-form";
import { MaterialDetailsDialog } from "@/components/materials/material-details";
import { callApi } from "@/service/ApiService";

function MaterialsPageContent() {
  usePageMeta("Materials", [{ label: "Materials" }]);

  const { toast } = useToast();

  const [materials, setMaterials] = React.useState<Material[]>([]);
  const [query, setQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");

  const [page, setPage] = React.useState(1);
  const [limit] = React.useState(10);

  const [totalMaterials, setTotalMaterials] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(0);

  const [loading, setLoading] = React.useState(true);
  const [detailsLoading, setDetailsLoading] = React.useState(false);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Material | undefined>();

  const [viewing, setViewing] = React.useState<Material | undefined>();

  const [deleting, setDeleting] = React.useState<Material | null>(null);

  const [rateTarget, setRateTarget] =
    React.useState<Material | null>(null);

  const [rateValue, setRateValue] = React.useState("");

  /*
   * Debounce search input
   */
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  /*
   * Get all materials
   */
  const getMaterials = React.useCallback(async () => {
    try {
      setLoading(true);

      const response =
        await callApi<MaterialsListApiResponse>({
          method: "GET",
          url: "/materials/getAll",
          params: {
            page,
            limit,
            search: debouncedQuery.trim(),
          },
        });

      setMaterials(response.materialData.materials);
      setTotalMaterials(
        response.materialData.totalMaterials,
      );
      setTotalPages(response.materialData.totalPages);
    } catch (error) {
      console.error("Get all materials error:", error);

      toast({
        title: "Failed to fetch materials",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedQuery, toast]);

  /*
   * Get material by ID
   */
  const getMaterialById = React.useCallback(
    async (id: string) => {
      try {
        setDetailsLoading(true);

        const response =
          await callApi<MaterialApiResponse>({
            method: "GET",
            url: `/materials/${id}`,
          });

        setViewing(response.material);
      } catch (error) {
        console.error("Get material by id error:",error,);
      } finally {
        setDetailsLoading(false);
      }
    },
    [toast],
  );

  /*
   * Fetch materials whenever page or debounced search changes
   */
  React.useEffect(() => {
    getMaterials();
  }, [getMaterials]);

  /*
   * Calculate stock totals
   */
  const totals = React.useMemo(() => {
    const stock = materials.reduce(
      (sum, material) =>
        sum + Number(material.totalUnits ?? 0),
      0,
    );

    const out = materials.reduce((sum, material) => {
      const totalStock = Number(
        material.totalUnits ?? 0,
      );

      const availableStock = Number(
        material.availableUnits ?? totalStock,
      );

      return sum + (totalStock - availableStock);
    }, 0);

    return {
      stock,
      out,
    };
  }, [materials]);

  /*
   * Open add material form
   */
  const openAdd = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  /*
   * Open edit material form
   */
  const openEdit = (material: Material) => {
    setEditing(material);
    setFormOpen(true);
  };

  /*
   * Update daily rental rate
   */
  const saveRate = async () => {
    if (!rateTarget) return;

    const value = Number(rateValue);

    if (!Number.isFinite(value) || value <= 0) {
      toast({
        title: "Enter a valid daily rate",
        tone: "error",
      });

      return;
    }

    try {
      await callApi({
        method: "PUT",
        url: `/materials/${rateTarget.id}`,
        data: {
          dailyRentalRate: value,
        },
      });

      toast({
        title: "Daily rate updated",
        tone: "success",
      });

      setRateTarget(null);
      setRateValue("");

      await getMaterials();
    } catch (error) {
      console.error(
        "Update daily rate error:",
        error,
      );

      toast({
        title: "Failed to update daily rate",
        tone: "error",
      });
    }
  };

  /*
   * Delete material
   */
  const deleteMaterial = async () => {
    if (!deleting) return;

    try {
     const response =  await callApi<DeleteMaterialApiResponse>({
        method: "DELETE",
        url: `/materials/delete/${deleting.id}`,
      });

      toast({
        title: response.message,
        description: deleting.name,
        tone: "success",
      });

      setDeleting(null);

      if (materials.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        await getMaterials();
      }
    } catch (error) {
      console.error( "Delete material error:", error,);
    }
  };

  /*
   * Activate or deactivate material
   */
  const toggleMaterialStatus = async (
    material: Material,
  ) => {
    try {
     const response =  await callApi<DeleteMaterialApiResponse>({
        method: "PUT",
        url: `/materials/activate/${material.id}`,
        data: {
          isActive: material.isActive === false,
        },
      });

      toast({
        title: response.message || "Material activate successfully",
        tone: "success",
      });

      await getMaterials();
    } catch (error) {
      console.error(
        "Update material status error:",
        error,
      );

      toast({
        title: "Failed to update material status",
        tone: "error",
      });
    }
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageIntro
        description={`${formatNumber(
          totals.stock,
        )} pieces in the yard, ${formatNumber(
          totals.out,
        )} of them out on rent right now.`}
        actions={
          <Button
            variant="primary"
            onClick={openAdd}
          >
            <Plus />
            Add material
          </Button>
        }
      />

      <Card>
        {/* Search */}
        <div className="flex flex-wrap items-center gap-3 p-3">
          <div className="relative min-w-[14rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />

            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search materials"
              className="pl-9"
            />
          </div>
        </div>

        <div className="border-t border-line">
          {loading ? (
            <TableSkeleton
              rows={6}
              columns={6}
            />
          ) : materials.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title={
                debouncedQuery
                  ? "Nothing matches your search"
                  : "No materials yet"
              }
              message={
                debouncedQuery
                  ? "Try searching with another material name."
                  : "Add the materials your shop rents."
              }
              action={
                <Button
                  variant="primary"
                  onClick={openAdd}
                >
                  Add material
                </Button>
              }
            />
          ) : (
            <>
              <TableShell>
                <thead>
                  <tr>
                    <Th>Material</Th>
                    <Th align="right">Total</Th>
                    <Th align="right">Available</Th>
                    <Th align="right">
                      Rate / day
                    </Th>
                    <Th>Status</Th>
                    <Th align="right">
                      Actions
                    </Th>
                  </tr>
                </thead>

                <tbody>
                  {materials.map((material) => {
                    const totalStock = Number(
                      material.totalUnits ?? 0,
                    );

                    const availableStock = Number(
                      material.availableUnits ??
                        totalStock,
                    );

                    const low =
                      totalStock > 0 &&
                      availableStock <=
                        totalStock * 0.15;

                    return (
                      <Tr
                        key={material.id}
                        clickable
                        onClick={() =>
                          getMaterialById(material.id)
                        }
                      >
                        <Td>
                          <span className="block font-medium text-ink">
                            {material.name || "-"}
                          </span>
                        </Td>

                        <Td align="right">
                          <span className="tabular text-[13px]">
                            {formatNumber(totalStock)}
                          </span>
                        </Td>

                        <Td align="right">
                          <span
                            className={`tabular text-[13px] font-medium ${
                              low
                                ? "text-amber"
                                : "text-ink"
                            }`}
                          >
                            {formatNumber(
                              availableStock,
                            )}
                          </span>
                        </Td>

                        <Td align="right">
                          <span className="tabular text-[13px] font-medium text-ink">
                            {formatCurrency(
                              material.dailyRentalRate,
                            )}
                          </span>
                        </Td>

                        <Td>
                          {material.isActive ===
                          false ? (
                            <Badge tone="neutral">
                              Deactivated
                            </Badge>
                          ) : low ? (
                            <Badge tone="amber">
                              Low stock
                            </Badge>
                          ) : (
                            <Badge tone="success">
                              Available
                            </Badge>
                          )}
                        </Td>

                        <Td
                          align="right"
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                        >
                          <RowMenu
                            actions={[
                              {
                                label: "View details",
                                icon: Eye,
                                onSelect: () =>
                                  getMaterialById(
                                    material.id,
                                  ),
                              },
                              {
                                label: "Edit material",
                                icon: Pencil,
                                onSelect: () =>
                                  openEdit(material),
                              },
                              {
                                label:
                                  material.isActive ===
                                  false
                                    ? "Activate"
                                    : "Deactivate",
                                icon: Power,
                                separatorBefore: true,
                                onSelect: () =>
                                  toggleMaterialStatus(
                                    material,
                                  ),
                              },
                              {
                                label: "Delete material",
                                icon: Trash2,
                                onSelect: () =>
                                  setDeleting(material),
                              },
                            ]}
                          />
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </TableShell>

              {totalPages > 1 ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line p-3">
                  <p className="text-sm text-ink-muted">
                    Page {page} of {totalPages} ·{" "}
                    {totalMaterials} materials
                  </p>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      disabled={
                        page === 1 || loading
                      }
                      onClick={() =>
                        setPage(
                          (currentPage) =>
                            currentPage - 1,
                        )
                      }
                    >
                      Previous
                    </Button>

                    <Button
                      variant="secondary"
                      disabled={
                        page === totalPages ||
                        loading
                      }
                      onClick={() =>
                        setPage(
                          (currentPage) =>
                            currentPage + 1,
                        )
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </Card>

      <p className="mt-3 text-[12px] leading-relaxed text-ink-muted">
        Rates apply to new rentals only. Every rental
        keeps the rate it was created with.
      </p>

      {/* Add/Edit Material Dialog */}
      <MaterialFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        material={editing}
        onSaved={async () => {
          setFormOpen(false);
          await getMaterials();
        }}
      />

      {/* Material Details Dialog */}
      <MaterialDetailsDialog
        material={viewing}
        onClose={() => setViewing(undefined)}
        onEdit={(material) => {
          setViewing(undefined);
          setEditing(material);
          setFormOpen(true);
        }}
      />

      {/* Update Daily Rate Dialog */}
      <Dialog
        open={Boolean(rateTarget)}
        onClose={() => {
          setRateTarget(null);
          setRateValue("");
        }}
        title={`Update rate for ${
          rateTarget?.name ?? ""
        }`}
        description="New rentals pick this up immediately."
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setRateTarget(null);
                setRateValue("");
              }}
            >
              Cancel
            </Button>

            <Button
              variant="primary"
              onClick={saveRate}
            >
              Update rate
            </Button>
          </>
        }
      >
        <Field
          label="Daily rate (₹)"
          htmlFor="rate"
          hint={`Currently ${formatCurrency(
            rateTarget?.dailyRentalRate ?? 0,
          )} per day.`}
        >
          <Input
            id="rate"
            type="number"
            min={1}
            step="0.5"
            className="tabular"
            value={rateValue}
            onChange={(event) =>
              setRateValue(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                saveRate();
              }
            }}
          />
        </Field>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={deleteMaterial}
        title={`Delete ${
          deleting?.name ?? "material"
        }?`}
        message="Past rentals will keep their material record."
        confirmLabel="Delete material"
      />
    </div>
  );
}

export default function MaterialsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="skeleton h-72 rounded-card" />
      }
    >
      <MaterialsPageContent />
    </React.Suspense>
  );
}