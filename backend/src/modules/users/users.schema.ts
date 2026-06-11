import { z } from "zod";
import { passwordSchema } from "../auth/auth.schema";

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
  bio: z.string().max(256).optional(),
  avatarUrl: z.string().url().optional(),
  lastSeenPrivacy: z.enum(["EVERYONE", "CONTACTS", "NOBODY"]).optional(),
  groupAddPrivacy: z.enum(["EVERYONE", "CONTACTS", "NOBODY"]).optional(),
});

export const searchUsersSchema = z.object({
  q: z.string().min(1).max(64),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Joriy parol kiritilishi shart"),
  newPassword: passwordSchema,
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
