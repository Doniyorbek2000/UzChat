import { z } from "zod";

export const shareLocationSchema = z.object({
  conversationId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  isLive: z.boolean().optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
});

export const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type ShareLocationInput = z.infer<typeof shareLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
