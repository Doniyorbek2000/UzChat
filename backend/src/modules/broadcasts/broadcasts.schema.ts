import { z } from "zod";

export const createBroadcastListSchema = z.object({
  name: z.string().trim().min(1).max(64),
  memberIds: z.array(z.string().uuid()).min(1).max(256),
});

export const updateBroadcastListSchema = z
  .object({
    name: z.string().trim().min(1).max(64).optional(),
    memberIds: z.array(z.string().uuid()).min(1).max(256).optional(),
  })
  .refine((data) => data.name !== undefined || data.memberIds !== undefined, {
    message: "Hech narsa o'zgartirilmadi",
  });

export type CreateBroadcastListInput = z.infer<typeof createBroadcastListSchema>;
export type UpdateBroadcastListInput = z.infer<typeof updateBroadcastListSchema>;
