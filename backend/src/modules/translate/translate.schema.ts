import { z } from "zod";

export const translateSchema = z.object({
  messageId: z.string().uuid(),
  toLang: z.string().min(2).max(10),
});

export type TranslateInput = z.infer<typeof translateSchema>;
