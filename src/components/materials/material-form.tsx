"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import type { Material, MaterialApiResponse } from "@/types";
import {
  materialSchema,
  type MaterialFormValues,
} from "@/lib/validations";

import { useToast } from "@/components/ui/toast";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { callApi } from "@/service/ApiService";
import z from "zod";


type MaterialFormDialogProps = {
  open: boolean;
  onClose: () => void;
  material?: Material;
  onSaved?: (material: Material) => void | Promise<void>;
};

export function MaterialFormDialog({
  open,
  onClose,
  material,
  onSaved,
}: MaterialFormDialogProps) {
  const { toast } = useToast();
type MaterialFormInput = z.input<typeof materialSchema>;
type MaterialFormValues = z.output<typeof materialSchema>;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MaterialFormInput, unknown, MaterialFormValues>({
    resolver: zodResolver(materialSchema),
    defaultValues: {
      name: "",
      totalStock: undefined,
      dailyRate: undefined,
      description: "",
    },
  });

  React.useEffect(() => {
    if (!open) return;

    reset({
      name: material?.name ?? "",
      totalStock: material?.totalUnits ?? undefined,
      dailyRate: material?.dailyRentalRate ?? undefined,
      description: material?.description ?? "",
    });
  }, [open, material, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const response = await callApi<MaterialApiResponse>({
        method: material ? "PUT" : "POST",
        url: material
          ? `/materials/update/${material.id}`
          : "/materials/create",
        data: {
          name: values.name,
          totalUnits: values.totalStock,
          dailyRentalRate: values.dailyRate,
          description: values.description,
        },
      });
    
      await onSaved?.(response.material);
      reset({
      name: "",
      totalStock: undefined,
      dailyRate: undefined,
      description: "",
    });

      toast({
        title:
          response.message ||
          (material
            ? "Material updated successfully."
            : "Material added successfully."),
        tone: "success",
      });

      onClose();
    } catch (error) {
      console.error("Material form error:", error);
    }
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={material ? `Edit ${material.name}` : "Add material"}
      description={
        material
          ? "Update material details."
          : "Add a new material."
      }
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={onSubmit}
            loading={isSubmitting}
          >
            {material ? "Save changes" : "Add material"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="Material name"
          htmlFor="name"
          required
          error={errors.name?.message}
        >
          <Input
            id="name"
            placeholder="Enter material name"
            {...register("name")}
          />
        </Field>

        <Field
          label="Total units"
          htmlFor="totalStock"
          error={errors.totalStock?.message}
          hint="Optional. Total quantity available in the shop."
        >
          <Input
            id="totalStock"
            type="number"
            min={0}
            step={1}
            placeholder="Enter total units"
            className="tabular"
            {...register("totalStock", {
              setValueAs: (value) =>
                value === "" ? undefined : Number(value),
            })}
          />
        </Field>

        <Field
          label="Daily rental rate (₹)"
          htmlFor="dailyRate"
          required
          error={errors.dailyRate?.message}
        >
          <Input
            id="dailyRate"
            type="number"
            min={0}
            step="0.5"
            placeholder="Enter daily rental rate"
            className="tabular"
            {...register("dailyRate", {
              setValueAs: (value) =>
                value === "" ? undefined : Number(value),
            })}
          />
        </Field>

        <Field
          label="Description"
          htmlFor="description"
          error={errors.description?.message}
        >
          <Textarea
            id="description"
            rows={3}
            placeholder="Enter material description"
            {...register("description")}
          />
        </Field>

        <button
          type="submit"
          className="hidden"
          aria-hidden="true"
        />
      </form>
    </Dialog>
  );
}