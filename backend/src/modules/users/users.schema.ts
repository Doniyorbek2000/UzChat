import { z } from "zod";

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  bio: z.string().max(256).optional(),
  avatarUrl: z.string().url().optional(),
});

export const searchUsersSchema = z.object({
  q: z.string().min(1).max(64),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
