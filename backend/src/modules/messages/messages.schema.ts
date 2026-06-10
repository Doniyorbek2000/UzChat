import { z } from "zod";

export const sendMessageSchema = z.object({
  type: z.enum(["TEXT", "IMAGE", "VIDEO", "AUDIO", "FILE"]).default("TEXT"),
  // base64 NaCl secretbox ciphertext, encrypted client-side with the conversation key
  ciphertext: z.string().min(1),
  nonce: z.string().min(1),
  mediaUrl: z.string().url().optional(),
  replyToId: z.string().uuid().optional(),
});

export const listMessagesQuerySchema = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
