import { z } from "zod";
import { passwordSchema, usernameSchema } from "../auth/auth.schema";

export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  displayName: z.string().min(1).max(64).optional(),
  bio: z.string().max(256).optional(),
  avatarUrl: z.string().url().optional(),
  lastSeenPrivacy: z.enum(["EVERYONE", "CONTACTS", "NOBODY"]).optional(),
  groupAddPrivacy: z.enum(["EVERYONE", "CONTACTS", "NOBODY"]).optional(),
  messagePrivacy: z.enum(["EVERYONE", "CONTACTS", "NOBODY"]).optional(),
  phoneNumberPrivacy: z.enum(["EVERYONE", "CONTACTS", "NOBODY"]).optional(),
  readReceiptsEnabled: z.boolean().optional(),
  typingIndicatorsEnabled: z.boolean().optional(),
});

export const searchUsersSchema = z.object({
  q: z.string().min(1).max(64),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Joriy parol kiritilishi shart"),
  newPassword: passwordSchema,
});

export const setTwoFactorSchema = z.object({
  currentPassword: z.string().min(1, "Joriy parol kiritilishi shart"),
  twoFactorPassword: passwordSchema,
  hint: z.string().max(100).optional(),
});

export const disableTwoFactorSchema = z.object({
  currentPassword: z.string().min(1, "Joriy parol kiritilishi shart"),
});

export const deleteAccountSchema = z.object({
  currentPassword: z.string().min(1, "Joriy parol kiritilishi shart"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SetTwoFactorInput = z.infer<typeof setTwoFactorSchema>;
export type DisableTwoFactorInput = z.infer<typeof disableTwoFactorSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
