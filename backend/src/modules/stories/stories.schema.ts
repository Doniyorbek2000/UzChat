import { z } from "zod";

export const createStorySchema = z.object({
  mediaUrl: z.string().min(1),
  caption: z.string().max(500).optional(),
});

export type CreateStoryInput = z.infer<typeof createStorySchema>;
