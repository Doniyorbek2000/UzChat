import { z } from "zod";

const participantKeySchema = z.object({
  userId: z.string().uuid(),
  // base64 NaCl box: the conversation's symmetric key encrypted for this user's publicKey
  wrappedKey: z.string().min(1),
  wrappedKeyNonce: z.string().min(1),
});

export const createConversationSchema = z
  .object({
    type: z.enum(["DIRECT", "GROUP"]),
    title: z.string().min(1).max(64).optional(),
    // public key of the creator's device, used to wrap the symmetric key for everyone
    keySenderPublicKey: z.string().min(1),
    participants: z.array(participantKeySchema).min(1),
  })
  .refine((data) => data.type !== "GROUP" || data.participants.length >= 2, {
    message: "Guruhda kamida 2 ta ishtirokchi bo'lishi kerak",
    path: ["participants"],
  })
  // DIRECT conversations have exactly 2 participants, except a "Saved Messages"
  // self-conversation which has only the owner as its sole participant.
  .refine((data) => data.type === "GROUP" || data.participants.length === 1 || data.participants.length === 2, {
    message: "DIRECT suhbatda aniq 2 ta ishtirokchi bo'lishi kerak",
    path: ["participants"],
  })
  .refine((data) => data.type === "GROUP" || data.participants.length !== 1 || data.title === undefined, {
    message: "Saqlangan xabarlar uchun nom kerak emas",
    path: ["title"],
  })
  .refine((data) => data.type === "DIRECT" || !!data.title, {
    message: "Guruh nomi kiritilishi shart",
    path: ["title"],
  });

export const addParticipantSchema = z.object({
  userId: z.string().uuid(),
  wrappedKey: z.string().min(1),
  wrappedKeyNonce: z.string().min(1),
  keySenderPublicKey: z.string().min(1),
});

// 1 hour, the longest supported slow-mode delay between a member's messages.
const MAX_SLOW_MODE_SECONDS = 60 * 60;

export const updateConversationSchema = z
  .object({
    title: z.string().min(1).max(64).optional(),
    avatarUrl: z.string().url().optional(),
    description: z.string().max(500).nullable().optional(),
    onlyAdminsCanSend: z.boolean().optional(),
    slowModeSeconds: z.number().int().min(0).max(MAX_SLOW_MODE_SECONDS).optional(),
    noForwards: z.boolean().optional(),
    requireAdminApproval: z.boolean().optional(),
    membersCanAddMembers: z.boolean().optional(),
    membersCanPinMessages: z.boolean().optional(),
    membersCanChangeInfo: z.boolean().optional(),
    membersCanSendMedia: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.avatarUrl !== undefined ||
      data.description !== undefined ||
      data.onlyAdminsCanSend !== undefined ||
      data.slowModeSeconds !== undefined ||
      data.noForwards !== undefined ||
      data.requireAdminApproval !== undefined ||
      data.membersCanAddMembers !== undefined ||
      data.membersCanPinMessages !== undefined ||
      data.membersCanChangeInfo !== undefined ||
      data.membersCanSendMedia !== undefined,
    { message: "Hech narsa o'zgartirilmadi" }
  );

export const updateParticipantRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});

export const updateParticipantRestrictionSchema = z.object({
  // "1h"/"1d"/"1w": restrict for that duration; "forever": restrict indefinitely; "off": lift restriction.
  restrictFor: z.enum(["1h", "1d", "1w", "forever", "off"]),
});

export const updatePreferencesSchema = z
  .object({
    isPinned: z.boolean().optional(),
    // "1h"/"8h"/"1d"/"1w": mute for that duration; "forever": mute indefinitely; "off": unmute.
    muteFor: z.enum(["1h", "8h", "1d", "1w", "forever", "off"]).optional(),
    isArchived: z.boolean().optional(),
    markedUnread: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.isPinned !== undefined ||
      data.muteFor !== undefined ||
      data.isArchived !== undefined ||
      data.markedUnread !== undefined,
    { message: "Hech narsa o'zgartirilmadi" }
  );

export const joinByInviteSchema = z.object({
  wrappedKey: z.string().min(1),
  wrappedKeyNonce: z.string().min(1),
  keySenderPublicKey: z.string().min(1),
});

// 30 days, the longest supported invite-link expiry.
const MAX_INVITE_EXPIRES_SECONDS = 30 * 24 * 60 * 60;

export const createInviteLinkSchema = z.object({
  // Seconds until the new invite code expires; null/undefined means it never expires.
  expiresInSeconds: z.number().int().positive().max(MAX_INVITE_EXPIRES_SECONDS).nullable().optional(),
  // Max number of times the new invite code can be used to join; null/undefined means unlimited.
  maxUses: z.number().int().positive().max(100000).nullable().optional(),
});

// 90 days, the longest supported disappearing-messages duration.
const MAX_DISAPPEARING_SECONDS = 90 * 24 * 60 * 60;

export const updateDisappearingMessagesSchema = z.object({
  disappearingSeconds: z.number().int().positive().max(MAX_DISAPPEARING_SECONDS).nullable(),
});

export const setNoForwardsSchema = z.object({
  noForwards: z.boolean(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type AddParticipantInput = z.infer<typeof addParticipantSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type UpdateParticipantRoleInput = z.infer<typeof updateParticipantRoleSchema>;
export type UpdateParticipantRestrictionInput = z.infer<typeof updateParticipantRestrictionSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type JoinByInviteInput = z.infer<typeof joinByInviteSchema>;
export type CreateInviteLinkInput = z.infer<typeof createInviteLinkSchema>;
export type UpdateDisappearingMessagesInput = z.infer<typeof updateDisappearingMessagesSchema>;
