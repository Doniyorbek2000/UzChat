import { z } from "zod";
import { passwordSchema, usernameSchema } from "../auth/auth.schema";

const MAX_DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const updateProfileSchema = z
  .object({
    username: usernameSchema.optional(),
    displayName: z.string().min(1).max(64).optional(),
    bio: z.string().max(256).optional(),
    avatarUrl: z.string().url().optional(),
    lastSeenPrivacy: z.enum(["EVERYONE", "CONTACTS", "NOBODY"]).optional(),
    avatarPrivacy: z.enum(["EVERYONE", "CONTACTS", "NOBODY"]).optional(),
    groupAddPrivacy: z.enum(["EVERYONE", "CONTACTS", "NOBODY"]).optional(),
    messagePrivacy: z.enum(["EVERYONE", "CONTACTS", "NOBODY"]).optional(),
    phoneNumberPrivacy: z.enum(["EVERYONE", "CONTACTS", "NOBODY"]).optional(),
    readReceiptsEnabled: z.boolean().optional(),
    typingIndicatorsEnabled: z.boolean().optional(),
    notifyPrivateChats: z.boolean().optional(),
    notifyGroupChats: z.boolean().optional(),
    notifyReactions: z.boolean().optional(),
    hideNotificationContent: z.boolean().optional(),
    // Birthday is stored as day-of-month + month only (no year), to avoid
    // revealing the user's age. Both fields must be set or cleared together.
    birthdayDay: z.number().int().min(1).max(31).nullable().optional(),
    birthdayMonth: z.number().int().min(1).max(12).nullable().optional(),
    birthdayPrivacy: z.enum(["EVERYONE", "CONTACTS", "NOBODY"]).optional(),
  })
  .refine(
    (data) => {
      if (data.birthdayDay === undefined && data.birthdayMonth === undefined) return true;
      if ((data.birthdayDay === null) !== (data.birthdayMonth === null)) return false;
      if (data.birthdayDay == null || data.birthdayMonth == null) return true;
      return data.birthdayDay <= MAX_DAYS_IN_MONTH[data.birthdayMonth - 1];
    },
    { message: "Tug'ilgan kun sanasi noto'g'ri" }
  );

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
