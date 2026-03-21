import { z } from "zod";

export const clientSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
  companyName: z.string().optional(),
  companyIco: z.string().optional(),
  companyDic: z.string().optional(),
});

export const additionalItemSchema = z.object({
  title: z.string().min(1, "Title is required"),
  cost: z.number().min(0, "Cost must be positive"),
  price: z.number().min(0, "Price must be positive").optional(),
});

export const lineItemSchema = z.object({
  productId: z.string().optional(),
  sku: z.string().optional(),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitCost: z.number().min(0, "Cost must be positive"),
  unitCostEur: z.number().min(0, "Unit cost EUR must be positive").optional(),
  total: z.number().min(0, "Total must be positive"),
  image: z.string().optional(),
  vatRate: z.number().min(0).max(100).optional(),
  dimensions: z
    .object({
      height: z.number().nullable().optional(),
      depth: z.number().nullable().optional(),
      diameter: z.number().nullable().optional(),
      opening: z.number().nullable().optional(),
      length: z.number().nullable().optional(),
      potSize: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export const itemGroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Group name is required"),
  notes: z.string().optional(),
  discount: z.number().min(0, "Discount must be positive").default(0),
  discountType: z.enum(["fixed", "percent"]).default("fixed"),
  items: z.array(lineItemSchema),
});

export const createOfferSchema = z.object({
  client: clientSchema,
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  items: z.array(itemGroupSchema).optional(),
  additionalItems: z.array(additionalItemSchema).optional(),
  subtotal: z.number().min(0, "Subtotal must be positive"),
  discount: z.number().min(0, "Discount must be positive").optional(),
  tax: z.number().min(0, "Tax must be positive").optional(),
  total: z.number().min(0, "Total must be positive"),
  currency: z.string().length(3, "Currency must be 3 characters").optional(),
  exchangeRate: z.number().min(0, "Exchange rate must be positive").optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
  validUntil: z.string().datetime().optional(),
  notes: z.string().optional(),
  sellMultiplier: z.number().min(0).optional(),
});

export const updateOfferSchema = z.object({
  clientId: z.string().min(1, "Client ID is required").optional(),
  title: z.string().min(1, "Title is required").optional(),
  description: z.string().optional(),
  items: z.array(itemGroupSchema).optional(),
  additionalItems: z.array(additionalItemSchema).optional(),
  subtotal: z.number().min(0, "Subtotal must be positive").optional(),
  discount: z.number().min(0, "Discount must be positive").optional(),
  tax: z.number().min(0, "Tax must be positive").optional(),
  total: z.number().min(0, "Total must be positive").optional(),
  currency: z.string().length(3, "Currency must be 3 characters").optional(),
  exchangeRate: z.number().min(0, "Exchange rate must be positive").optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
  validUntil: z.string().datetime().optional(),
  notes: z.string().optional(),
  sellMultiplier: z.number().min(0).optional(),
  totalRounded: z.number().min(0).nullable().optional(),
  companyProfile: z
    .object({
      companyName: z.string(),
      companyIco: z.string(),
      companyDic: z.string(),
      logoUrl: z.string().optional(),
      fakturoidSlug: z.string().optional(),
    })
    .nullable()
    .optional(),
  proformaUrl: z.string().url().nullable().optional(),
  proformaId: z.number().int().nullable().optional(),
});

export const addItemsToOfferSchema = z.object({
  items: z.array(lineItemSchema).min(1, "At least one item is required"),
  groupId: z.string().optional(),
});

export const offerIdSchema = z.object({
  id: z
    .string()
    .refine((val) => /^\d+$/.test(val) || val.trim().length > 0, "ID is required"),
});

export const listOffersQuerySchema = z.object({
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]).optional(),
  clientId: z.string().min(1, "Client ID is required").optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;
export type AddItemsToOfferInput = z.infer<typeof addItemsToOfferSchema>;
export type ListOffersQuery = z.infer<typeof listOffersQuerySchema>;
