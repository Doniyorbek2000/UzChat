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
    // Sent as a SYSTEM message to new members when they join the group; null disables it.
    welcomeMessage: z.string().trim().min(1).max(500).nullable().optional(),
    onlyAdminsCanSend: z.boolean().optional(),
    slowModeSeconds: z.number().int().min(0).max(MAX_SLOW_MODE_SECONDS).optional(),
    noForwards: z.boolean().optional(),
    requireAdminApproval: z.boolean().optional(),
    membersCanAddMembers: z.boolean().optional(),
    membersCanPinMessages: z.boolean().optional(),
    membersCanChangeInfo: z.boolean().optional(),
    membersCanSendMedia: z.boolean().optional(),
    hideHistoryForNewMembers: z.boolean().optional(),
    hideMembersList: z.boolean().optional(),
    reactionsEnabled: z.boolean().optional(),
  })
  .refine(
    (data) =>
      data.title !== undefined ||
      data.avatarUrl !== undefined ||
      data.description !== undefined ||
      data.welcomeMessage !== undefined ||
      data.onlyAdminsCanSend !== undefined ||
      data.slowModeSeconds !== undefined ||
      data.noForwards !== undefined ||
      data.requireAdminApproval !== undefined ||
      data.membersCanAddMembers !== undefined ||
      data.membersCanPinMessages !== undefined ||
      data.membersCanChangeInfo !== undefined ||
      data.membersCanSendMedia !== undefined ||
      data.hideHistoryForNewMembers !== undefined ||
      data.hideMembersList !== undefined ||
      data.reactionsEnabled !== undefined,
    { message: "Hech narsa o'zgartirilmadi" }
  );

export const updateParticipantRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});

export const updateParticipantRestrictionSchema = z.object({
  // "1h"/"1d"/"1w": restrict for that duration; "forever": restrict indefinitely; "off": lift restriction.
  restrictFor: z.enum(["1h", "1d", "1w", "forever", "off"]),
});

export const updateParticipantCustomTitleSchema = z.object({
  // Custom label shown instead of "Admin"/"Owner" for this participant; null clears it.
  customTitle: z
    .string()
    .trim()
    .max(16, "Unvon 16 ta belgidan oshmasligi kerak")
    .nullable(),
});

// 180 days, the longest supported "auto-delete inactive chat" duration.
const MAX_AUTO_DELETE_SECONDS = 180 * 24 * 60 * 60;

export const updatePreferencesSchema = z
  .object({
    isPinned: z.boolean().optional(),
    // "1h"/"2h"/"8h"/"1d"/"2d"/"1w": mute for that duration; "forever": mute indefinitely; "off": unmute.
    muteFor: z.enum(["1h", "2h", "8h", "1d", "2d", "1w", "forever", "off"]).optional(),
    isArchived: z.boolean().optional(),
    markedUnread: z.boolean().optional(),
    // Per-conversation override of the global "hide notification content" setting.
    notificationPreview: z.enum(["DEFAULT", "SHOW", "HIDE"]).optional(),
    // Per-conversation override of the global "read receipts" setting.
    readReceiptsOverride: z.enum(["DEFAULT", "ON", "OFF"]).optional(),
    // GROUP only: full replacement list of participant userIds whose messages
    // shouldn't trigger notifications for this user.
    mutedSenderIds: z.array(z.string().uuid()).optional(),
    // Seconds of inactivity (no new message) after which this chat is auto-removed
    // from this user's chat list; null/undefined-with-other-fields turns it off.
    autoDeleteAfterSeconds: z.number().int().positive().max(MAX_AUTO_DELETE_SECONDS).nullable().optional(),
  })
  .refine(
    (data) =>
      data.isPinned !== undefined ||
      data.muteFor !== undefined ||
      data.isArchived !== undefined ||
      data.markedUnread !== undefined ||
      data.notificationPreview !== undefined ||
      data.readReceiptsOverride !== undefined ||
      data.mutedSenderIds !== undefined ||
      data.autoDeleteAfterSeconds !== undefined,
    { message: "Hech narsa o'zgartirilmadi" }
  );

export const reorderPinnedSchema = z.object({
  direction: z.enum(["up", "down"]),
});

// 30 days, the longest supported temporary message-pin duration.
const MAX_PIN_EXPIRES_SECONDS = 30 * 24 * 60 * 60;

export const pinMessageSchema = z.object({
  // Seconds until the pin is automatically removed; null/undefined means it never expires.
  expiresInSeconds: z.number().int().positive().max(MAX_PIN_EXPIRES_SECONDS).nullable().optional(),
});

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

export const patSchema = z.object({
  targetUserId: z.string().uuid(),
});

export const clearHistorySchema = z.object({
  // When set, only messages older than this many days are cleared instead of everything.
  olderThanDays: z.number().int().positive().optional(),
});

export const markReadSchema = z.object({
  // When set, marks read up to (and including) this message instead of the latest one.
  upToMessageId: z.string().uuid().optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type AddParticipantInput = z.infer<typeof addParticipantSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type UpdateParticipantRoleInput = z.infer<typeof updateParticipantRoleSchema>;
export type UpdateParticipantRestrictionInput = z.infer<typeof updateParticipantRestrictionSchema>;
export type UpdateParticipantCustomTitleInput = z.infer<typeof updateParticipantCustomTitleSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type ReorderPinnedInput = z.infer<typeof reorderPinnedSchema>;
export type PinMessageInput = z.infer<typeof pinMessageSchema>;
export type JoinByInviteInput = z.infer<typeof joinByInviteSchema>;
export type CreateInviteLinkInput = z.infer<typeof createInviteLinkSchema>;
export type UpdateDisappearingMessagesInput = z.infer<typeof updateDisappearingMessagesSchema>;
export type ClearHistoryInput = z.infer<typeof clearHistorySchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;
