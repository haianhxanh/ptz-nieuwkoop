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
  company_name: z.string().optional(),
  company_ico: z.string().optional(),
  company_dic: z.string().optional(),
});

export const additionalItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  price: z.number().min(0, "Price must be positive"),
  sell_price: z.number().min(0, "Sell price must be positive").optional(),
});

export const lineItemSchema = z.object({
  product_id: z.string().optional(),
  sku: z.string().optional(),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unit_price: z.number().min(0, "Price must be positive"),
  unit_price_eur: z.number().min(0, "Unit price EUR must be positive").optional(),
  total: z.number().min(0, "Total must be positive"),
  image: z.string().optional(),
  vat_rate: z.number().min(0).max(100).optional(),
  dimensions: z
    .object({
      height: z.number().min(0, "Height must be positive").optional(),
      depth: z.number().min(0, "Depth must be positive").optional(),
      diameter: z.number().min(0, "Diameter must be positive").optional(),
      opening: z.number().min(0, "Opening must be positive").optional(),
      length: z.number().min(0, "Length must be positive").optional(),
    })
    .optional(),
});

export const itemGroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Group name is required"),
  discount: z.number().min(0, "Discount must be positive").default(0),
  discount_type: z.enum(["fixed", "percent"]).default("fixed"),
  items: z.array(lineItemSchema),
});

export const createOfferSchema = z.object({
  customer: customerSchema,
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  items: z.array(itemGroupSchema).optional(),
  additional_items: z.array(additionalItemSchema).optional(),
  subtotal: z.number().min(0, "Subtotal must be positive"),
  discount: z.number().min(0, "Discount must be positive").optional(),
  tax: z.number().min(0, "Tax must be positive").optional(),
  total: z.number().min(0, "Total must be positive"),
  currency: z.string().length(3, "Currency must be 3 characters").optional(),
  exchange_rate: z.number().min(0, "Exchange rate must be positive").optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
  valid_until: z.string().datetime().optional(),
  notes: z.string().optional(),
  sell_multiplier: z.number().min(0).optional(),
});

export const updateOfferSchema = z.object({
  customer_id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  items: z.array(itemGroupSchema).optional(),
  additional_items: z.array(additionalItemSchema).optional(),
  subtotal: z.number().min(0, "Subtotal must be positive").optional(),
  discount: z.number().min(0, "Discount must be positive").optional(),
  tax: z.number().min(0, "Tax must be positive").optional(),
  total: z.number().min(0, "Total must be positive").optional(),
  currency: z.string().length(3, "Currency must be 3 characters").optional(),
  exchange_rate: z.number().min(0, "Exchange rate must be positive").optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
  valid_until: z.string().datetime().optional(),
  notes: z.string().optional(),
  sell_multiplier: z.number().min(0).optional(),
  total_rounded: z.number().min(0).nullable().optional(),
  company_profile: z.object({
    company_name: z.string(),
    company_ico: z.string(),
    company_dic: z.string(),
    logo_url: z.string().optional(),
  }).nullable().optional(),
  proforma_url: z.string().url().nullable().optional(),
  proforma_id: z.number().int().nullable().optional(),
});

export const addItemsToOfferSchema = z.object({
  items: z.array(lineItemSchema).min(1, "At least one item is required"),
  group_id: z.string().optional(),
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
