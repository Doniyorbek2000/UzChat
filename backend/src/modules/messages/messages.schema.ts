import { z } from "zod";

export const sendMessageSchema = z
  .object({
    type: z.enum(["TEXT", "IMAGE", "VIDEO", "AUDIO", "FILE", "CONTACT", "POLL"]).default("TEXT"),
    // base64 NaCl secretbox ciphertext, encrypted client-side with the conversation key
    ciphertext: z.string().min(1),
    nonce: z.string().min(1),
    mediaUrl: z.string().url().optional(),
    replyToId: z.string().uuid().optional(),
    // user IDs of @-mentioned participants (sent in cleartext for notification routing)
    mentions: z.array(z.string().uuid()).max(50).optional(),
    // original sender's display name, set when forwarding a message from another conversation
    forwardedFromName: z.string().min(1).max(100).optional(),
    // ISO timestamp; if set and in the future, the message is delivered later instead of immediately.
    scheduledFor: z.string().datetime().optional(),
    // "View once": media is deleted after the recipient views it (IMAGE only).
    viewOnce: z.boolean().optional(),
    // POLL only: hides who voted for what from other participants.
    pollAnonymous: z.boolean().optional(),
    // "Send without sound": recipients are notified silently (no notification sound).
    silent: z.boolean().optional(),
  })
  .refine((data) => !data.scheduledFor || new Date(data.scheduledFor).getTime() > Date.now(), {
    message: "Yuborish vaqti kelajakda bo'lishi kerak",
    path: ["scheduledFor"],
  })
  .refine((data) => !data.viewOnce || data.type === "IMAGE", {
    message: "Bir martalik ko'rish faqat rasmlar uchun mavjud",
    path: ["viewOnce"],
  })
  .refine((data) => !data.pollAnonymous || data.type === "POLL", {
    message: "Anonim rejim faqat so'rovnomalar uchun mavjud",
    path: ["pollAnonymous"],
  });

export const listMessagesQuerySchema = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const setReactionSchema = z.object({
  emoji: z.string().min(1).max(8),
});

export const editMessageSchema = z.object({
  ciphertext: z.string().min(1),
  nonce: z.string().min(1),
  mentions: z.array(z.string().uuid()).max(50).optional(),
});

// optionIds reference the option list inside the poll's encrypted content,
// which the server can't read - they're treated as opaque strings here.
// An empty array retracts the user's vote.
export const votePollSchema = z.object({
  optionIds: z.array(z.string().min(1).max(50)).max(20),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
export type SetReactionInput = z.infer<typeof setReactionSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type VotePollInput = z.infer<typeof votePollSchema>;
