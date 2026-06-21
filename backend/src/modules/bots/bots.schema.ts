import { z } from "zod";

export const createBotSchema = z.object({
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z][a-zA-Z0-9_]*bot$/i, "Bot username must end with 'bot'"),
  displayName: z.string().trim().min(1).max(64),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

export const updateBotSchema = z.object({
  displayName: z.string().trim().min(1).max(64).optional(),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
  webhookUrl: z.string().url().optional(),
  isInline: z.boolean().optional(),
});

export const addCommandSchema = z.object({
  command: z.string().trim().min(1).max(32).regex(/^[a-z0-9_]+$/),
  description: z.string().trim().min(1).max(200),
});

export type CreateBotInput = z.infer<typeof createBotSchema>;
export type UpdateBotInput = z.infer<typeof updateBotSchema>;
export type AddCommandInput = z.infer<typeof addCommandSchema>;
