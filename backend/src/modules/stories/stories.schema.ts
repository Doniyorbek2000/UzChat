import { z } from "zod";

export const createStorySchema = z.object({
  mediaUrl: z.string().url(),
  caption: z.string().trim().max(500).optional(),
});

export type CreateStoryInput = z.infer<typeof createStorySchema>;
