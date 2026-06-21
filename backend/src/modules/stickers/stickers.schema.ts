import { z } from "zod";

export const createStickerPackSchema = z.object({
  name: z.string().trim().min(1).max(64),
  description: z.string().trim().max(256).optional(),
  coverUrl: z.string().url().optional(),
  isAnimated: z.boolean().optional(),
});

export const addStickerSchema = z.object({
  imageUrl: z.string().url(),
  emoji: z.string().max(8).optional(),
});

export type CreateStickerPackInput = z.infer<typeof createStickerPackSchema>;
export type AddStickerInput = z.infer<typeof addStickerSchema>;
