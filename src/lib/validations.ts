import { z } from "zod";

const phoneRegex = /^[6-9]\d{9}$/;

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter the customer's full name.")
    .max(60, "Keep the name under 60 characters."),
  phone: z
    .string()
    .trim()
    .refine((value) => value.length > 0, { message: "Enter mobile number.", })
    .regex(phoneRegex, "Enter a valid 10-digit mobile number."),
  address: z.string().trim().max(200, "Keep the address under 200 characters.").optional(),
  notes: z.string().trim().max(300).optional(),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;

export const materialSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Material name is required.")
    .max(100, "Material name must be under 100 characters."),

  totalStock: z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) {
        return undefined;
      }
      return Number(value);
    },
    z .number({
        error: "Enter valid total units.",
      })
      .int("Total units must be a whole number.")
      .min(0, "Total units cannot be negative.")
      .optional(),
  ),

  dailyRate: z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) {
        return undefined;
      }
      return Number(value);
    },
    z
      .number({
        error: "Daily rental rate is required.",
      })
      .positive("Daily rental rate must be greater than 0."),
  ),

  description: z
    .string()
    .trim()
    .max(300, "Description must be under 300 characters.")
    .optional(),
});


export type MaterialFormValues = z.infer<typeof materialSchema>;

export const rentalItemSchema = z.object({
  materialId: z.string().min(1, "Pick a material."),
  quantity: z.number().int("Use whole numbers.").min(1, "Quantity must be at least 1."),
});

export const rentalSchema = z
  .object({
    customerId: z.string().min(1, "Select a customer for this rental."),
    items: z.array(rentalItemSchema).min(1, "Add at least one material."),
    issueDate: z.string().min(1, "Pick an issue date."),
    expectedReturnDate: z.string().optional().or(z.literal("")),
    notes: z.string().trim().max(300).optional(),
  })
  .refine(
    (value) =>
      !value.expectedReturnDate ||
      new Date(value.expectedReturnDate) >= new Date(value.issueDate),
    {
      message: "Expected return date cannot be before the issue date.",
      path: ["expectedReturnDate"],
    },
  );

export type RentalFormValues = z.infer<typeof rentalSchema>;

export const returnSchema = z.object({
  returnDate: z.string().min(1, "Enter the actual return date."),
  damageCharges: z.number().min(0, "Damage charges cannot be negative.").optional(),
  additionalCharges: z.number().min(0, "Additional charges cannot be negative.").optional(),
  discount: z.number().min(0, "Discount cannot be negative.").optional(),
  notes: z.string().trim().max(300).optional(),
});

export type ReturnFormValues = z.infer<typeof returnSchema>;

export const settingsSchema = z.object({
  shopName: z.string().trim().min(2, "Enter the shop name."),
  address: z.string().trim().min(4, "Enter the shop address."),
  phone: z.string().trim().min(6, "Enter a contact number."),
  gstNumber: z.string().trim().max(20).optional(),
  invoicePrefix: z.string().trim().min(1, "Enter an invoice prefix.").max(8),
  invoiceNotes: z.string().trim().max(300).optional(),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;

export const paymentSchema = z.object({
  amount: z.number().positive("Enter an amount greater than ₹0."),
});
