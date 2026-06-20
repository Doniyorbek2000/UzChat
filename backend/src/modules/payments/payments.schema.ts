import { z } from "zod";

export const sendPaymentSchema = z.object({
  receiverId: z.string().uuid(),
  amount: z.number().positive().max(50_000_000),
  currency: z.string().length(3).default("UZS"),
  note: z.string().max(200).optional(),
});

export const topUpSchema = z.object({
  amount: z.number().positive().max(50_000_000),
});

export type SendPaymentInput = z.infer<typeof sendPaymentSchema>;
export type TopUpInput = z.infer<typeof topUpSchema>;
