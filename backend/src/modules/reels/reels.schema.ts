import { z } from "zod";

export const createReelSchema = z.object({
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  caption: z.string().max(500).optional(),
  duration: z.number().int().min(1).max(300).optional(),
  musicTitle: z.string().max(100).optional(),
  musicArtist: z.string().max(100).optional(),
  hashtags: z.array(z.string().max(50)).max(30).optional(),
});

export const reelCommentSchema = z.object({
  text: z.string().trim().min(1).max(500),
  parentId: z.string().uuid().optional(),
});

export type CreateReelInput = z.infer<typeof createReelSchema>;
export type ReelCommentInput = z.infer<typeof reelCommentSchema>;
