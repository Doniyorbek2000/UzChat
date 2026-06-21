import { z } from "zod";

export const createVoiceRoomSchema = z.object({
  title: z.string().trim().min(1).max(100),
  conversationId: z.string().uuid().optional(),
  scheduledFor: z.string().datetime().optional(),
  maxSpeakers: z.number().int().min(2).max(50).optional(),
});

export type CreateVoiceRoomInput = z.infer<typeof createVoiceRoomSchema>;
