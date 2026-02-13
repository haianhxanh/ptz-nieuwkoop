import { z } from "zod";

export const customerSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
});

export const lineItemSchema = z.object({
  product_id: z.string().optional(),
  sku: z.string().optional(),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unit_price: z.number().min(0, "Price must be positive"),
  discount: z.number().min(0, "Discount must be positive").optional(),
  total: z.number().min(0, "Total must be positive"),
  image: z.string().optional(),
});

export const createOfferSchema = z.object({
  customer: customerSchema,
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  items: z.array(lineItemSchema).optional(),
  subtotal: z.number().min(0, "Subtotal must be positive"),
  discount: z.number().min(0, "Discount must be positive").optional(),
  tax: z.number().min(0, "Tax must be positive").optional(),
  total: z.number().min(0, "Total must be positive"),
  currency: z.string().length(3, "Currency must be 3 characters").optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
  valid_until: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const updateOfferSchema = z.object({
  customer_id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  items: z.array(lineItemSchema).optional(),
  subtotal: z.number().min(0, "Subtotal must be positive").optional(),
  discount: z.number().min(0, "Discount must be positive").optional(),
  tax: z.number().min(0, "Tax must be positive").optional(),
  total: z.number().min(0, "Total must be positive").optional(),
  currency: z.string().length(3, "Currency must be 3 characters").optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
  valid_until: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export const addItemsToOfferSchema = z.object({
  items: z.array(lineItemSchema).min(1, "At least one item is required"),
});

export const offerIdSchema = z.object({
  id: z
    .string()
    .refine((val) => /^\d+$/.test(val) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val), "ID must be a number or valid UUID"),
});

export const listOffersQuerySchema = z.object({
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
  customer_id: z.string().uuid().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;
export type AddItemsToOfferInput = z.infer<typeof addItemsToOfferSchema>;
export type ListOffersQuery = z.infer<typeof listOffersQuerySchema>;
