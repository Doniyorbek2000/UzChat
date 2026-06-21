import { z } from "zod";

export const createTopicSchema = z.object({
  title: z.string().trim().min(1).max(100),
  iconEmoji: z.string().trim().optional(),
  iconColor: z.string().trim().optional(),
});

export const updateTopicSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  iconEmoji: z.string().trim().optional(),
  iconColor: z.string().trim().optional(),
  isPinned: z.boolean().optional(),
  isClosed: z.boolean().optional(),
});

export type CreateTopicInput = z.infer<typeof createTopicSchema>;
export type UpdateTopicInput = z.infer<typeof updateTopicSchema>;
