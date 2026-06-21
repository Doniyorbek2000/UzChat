import { z } from "zod";

export const createGameSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  iconUrl: z.string().url().optional(),
  url: z.string().url(),
  category: z.enum(["casual", "puzzle", "action", "strategy", "multiplayer", "sports"]).optional(),
});

export const submitScoreSchema = z.object({
  score: z.number().int().min(0),
});

export type CreateGameInput = z.infer<typeof createGameSchema>;
