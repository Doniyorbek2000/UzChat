import { z } from "zod";

export const createPostSchema = z.object({
  content: z.string().max(2000).optional(),
  mediaUrls: z.array(z.string().url()).max(9).default([]),
  visibility: z.enum(["PUBLIC", "CONTACTS", "PRIVATE"]).default("PUBLIC"),
});

export const createCommentSchema = z.object({
  content: z.string().min(1).max(500),
});
