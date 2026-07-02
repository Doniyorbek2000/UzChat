import { z } from "zod";

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  type: z.enum(["users", "groups", "channels"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
