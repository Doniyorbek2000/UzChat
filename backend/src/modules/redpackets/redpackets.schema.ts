import { z } from "zod";

export const createRedPacketSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default("UZS"),
  message: z.string().max(200).optional(),
});
