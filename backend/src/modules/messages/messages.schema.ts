import { z } from "zod";

export const sendMessageSchema = z
  .object({
    type: z.enum(["TEXT", "IMAGE", "VIDEO", "AUDIO", "FILE", "CONTACT"]).default("TEXT"),
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
  })
  .refine((data) => !data.scheduledFor || new Date(data.scheduledFor).getTime() > Date.now(), {
    message: "Yuborish vaqti kelajakda bo'lishi kerak",
    path: ["scheduledFor"],
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

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
export type SetReactionInput = z.infer<typeof setReactionSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
