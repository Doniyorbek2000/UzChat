import { z } from "zod";

export const createMiniAppSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().max(256).optional(),
  url: z.string().url(),
  iconUrl: z.string().url().optional(),
  category: z.string().max(32).optional(),
});

export type CreateMiniAppInput = z.infer<typeof createMiniAppSchema>;

export const updateMiniAppSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  description: z.string().max(256).optional(),
  url: z.string().url().optional(),
  iconUrl: z.string().url().optional(),
  category: z.string().max(32).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateMiniAppInput = z.infer<typeof updateMiniAppSchema>;
