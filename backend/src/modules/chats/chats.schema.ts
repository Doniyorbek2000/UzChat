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
    participants: z.array(participantKeySchema).min(2),
  })
  .refine((data) => data.type === "GROUP" || data.participants.length === 2, {
    message: "DIRECT suhbatda aniq 2 ta ishtirokchi bo'lishi kerak",
    path: ["participants"],
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

export const updateConversationSchema = z
  .object({
    title: z.string().min(1).max(64).optional(),
    avatarUrl: z.string().url().optional(),
  })
  .refine((data) => data.title !== undefined || data.avatarUrl !== undefined, {
    message: "Hech narsa o'zgartirilmadi",
  });

export const updateParticipantRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});

export const updatePreferencesSchema = z
  .object({
    isPinned: z.boolean().optional(),
    isMuted: z.boolean().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine(
    (data) => data.isPinned !== undefined || data.isMuted !== undefined || data.isArchived !== undefined,
    { message: "Hech narsa o'zgartirilmadi" }
  );

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type AddParticipantInput = z.infer<typeof addParticipantSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type UpdateParticipantRoleInput = z.infer<typeof updateParticipantRoleSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
