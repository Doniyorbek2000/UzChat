import { z } from "zod";

export const createStoreSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  category: z.string().max(50).default("general"),
});

export const updateStoreSchema = createStoreSchema.partial();

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  sku: z.string().max(50).optional(),
  price: z.number().positive(),
  currency: z.string().default("UZS"),
  imageUrls: z.array(z.string().url()).max(10).default([]),
  stock: z.number().int().min(0).default(0),
  category: z.string().max(50).default("general"),
});

export const updateProductSchema = createProductSchema.partial();

export const createOrderSchema = z.object({
  storeId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
  shippingAddress: z.string().max(500).optional(),
  note: z.string().max(500).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
});
