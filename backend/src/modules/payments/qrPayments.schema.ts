import { z } from "zod";

export const createQrPaymentSchema = z.object({
  amount: z.number().positive().max(50_000_000).optional(),
  currency: z.string().length(3).default("UZS"),
  note: z.string().max(200).optional(),
});

export const payQrSchema = z.object({
  qrCode: z.string().min(1),
  amount: z.number().positive().max(50_000_000).optional(),
});

export type CreateQrPaymentInput = z.infer<typeof createQrPaymentSchema>;
export type PayQrInput = z.infer<typeof payQrSchema>;
