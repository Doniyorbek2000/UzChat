import { z } from "zod";

export const createPostSchema = z.object({
  content: z.string().trim().max(2000).optional(),
  mediaUrls: z.array(z.string().url()).max(9).default([]),
  visibility: z.enum(["PUBLIC", "CONTACTS", "PRIVATE"]).default("PUBLIC"),
});

export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(500),
});

export const paginationQuery = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).passthrough();
