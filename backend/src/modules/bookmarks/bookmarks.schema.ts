import { z } from "zod";

export const addBookmarkSchema = z.object({
  messageId: z.string().uuid(),
  label: z.string().max(100).optional(),
});

export type AddBookmarkInput = z.infer<typeof addBookmarkSchema>;
