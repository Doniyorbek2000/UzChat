import { z } from "zod";

export const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(32),
});

export const updateFolderSchema = z
  .object({
    name: z.string().trim().min(1).max(32).optional(),
    order: z.number().int().min(0).optional(),
    conversationIds: z.array(z.string().uuid()).max(200).optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.order !== undefined || data.conversationIds !== undefined,
    { message: "Hech narsa o'zgartirilmadi" }
  );

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
