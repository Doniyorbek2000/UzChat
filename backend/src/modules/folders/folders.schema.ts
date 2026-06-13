import { z } from "zod";

export const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(32),
});

export const updateFolderSchema = z
  .object({
    name: z.string().trim().min(1).max(32).optional(),
    order: z.number().int().min(0).optional(),
    conversationIds: z.array(z.string().uuid()).max(200).optional(),
    // Smart filters: auto-include conversations matching these criteria, in addition to conversationIds.
    includeUnread: z.boolean().optional(),
    includeGroups: z.boolean().optional(),
    includeDirect: z.boolean().optional(),
    excludeMuted: z.boolean().optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: "Hech narsa o'zgartirilmadi" }
  );

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
