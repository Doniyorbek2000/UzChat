import { z } from "zod";

export const createLiveStreamSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  thumbnailUrl: z.string().url().optional(),
  scheduledFor: z.string().optional(),
});

export type CreateLiveStreamInput = z.infer<typeof createLiveStreamSchema>;
