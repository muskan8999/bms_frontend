"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Customer, CustomerCreateApiResponse,  } from "@/types";
import { customerSchema, type CustomerFormValues } from "@/lib/validations";
import { useAppStore } from "@/store/app-store";
import { useToast } from "@/components/ui/toast";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { callApi } from "@/service/ApiService"

export function CustomerFormDialog({
  open,
  onClose,
  customer,
  fetchCustomers,
}: {
  open: boolean;
  onClose: () => void;
  customer?: Customer;
  fetchCustomers?: () => void;
}) {
  const { addCustomer, updateCustomer, state } = useAppStore();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    mode:"onChange",
    defaultValues: {
      name: customer?.name ?? "",
      phone: customer?.phone ?? "",
      address: customer?.address ?? "",
      notes: customer?.notes ?? "",
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        name: customer?.name ?? "",
        phone: customer?.phone ?? "",
        address: customer?.address ?? "",
        notes: customer?.notes ?? "",
      });
    }
  }, [open, customer, reset]);

  const onSubmit = handleSubmit(async(values) => {
   try{
    const res = await callApi<CustomerCreateApiResponse>({
      method: customer ? "PUT" : "POST",
      url: customer ? `/customers/${customer.id}` : "/customers/create",
      data: values,   
    })
    await fetchCustomers?.();
    toast({
      title: res.message || "Customer saved successfully.",
    })
    onClose();

   }catch(error){
    console.log("customer form error",error)
   }

  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={customer ? "Edit customer" : "Add customer"}
      description={
        customer
          ? "Changes apply to future rentals and bills."
          : "Name and mobile number are enough to start a rental."
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" onClick={onSubmit} loading={isSubmitting}>
            {customer ? "Save changes" : "Add customer"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name" htmlFor="name" required error={errors.name?.message}>
          <Input id="name" placeholder="Raj Kumar" autoComplete="off" {...register("name")} />
        </Field>

        <Field
          label="Mobile number"
          htmlFor="phone"
          required
          error={errors.phone?.message}
          hint="10 digits, no country code."
        >
          <Input
            id="phone"
            inputMode="numeric"
            placeholder="9876543210"
            className="tabular"
            {...register("phone", {
           onChange: (event) => {
            event.target.value = event.target.value
            .replace(/\D/g, "")
            .slice(0, 10);
            },
          })}
          />
        </Field>

        <Field label="Address" htmlFor="address" error={errors.address?.message}>
          <Input id="address" placeholder="House 221, Phase 7, Mohali" {...register("address")} />
        </Field>


        <Field label="Notes" htmlFor="notes" error={errors.notes?.message}>
          <Textarea
            id="notes"
            rows={3}
            placeholder="Site location, payment habits, anything worth remembering."
            {...register("notes")}
          />
        </Field>
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Dialog>
  );
}
