import { z } from "zod";

export const createExportSchema = z.object({
  conversationId: z.string().uuid(),
  format: z.enum(["txt", "json", "html"]).optional(),
  includeMedia: z.boolean().optional(),
});

export type CreateExportInput = z.infer<typeof createExportSchema>;
