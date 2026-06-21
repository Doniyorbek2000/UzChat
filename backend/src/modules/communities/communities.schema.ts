import { z } from "zod";

export const createCommunitySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

export const updateCommunitySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).optional(),
    avatarUrl: z.string().url().optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: "Hech narsa o'zgartirilmadi" }
  );

export const addGroupSchema = z.object({
  conversationId: z.string().uuid(),
});

export type CreateCommunityInput = z.infer<typeof createCommunitySchema>;
export type UpdateCommunityInput = z.infer<typeof updateCommunitySchema>;
export type AddGroupInput = z.infer<typeof addGroupSchema>;
