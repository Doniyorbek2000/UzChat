import { z } from "zod";

export const createReportSchema = z
  .object({
    reportedUserId: z.string().uuid(),
    conversationId: z.string().uuid().optional(),
    messageId: z.string().uuid().optional(),
    reason: z.enum(["SPAM", "HARASSMENT", "VIOLENCE", "ILLEGAL_CONTENT", "IMPERSONATION", "OTHER"]),
    description: z.string().trim().max(500).optional(),
  })
  .refine((data) => !data.messageId || !!data.conversationId, {
    message: "messageId uchun conversationId ham kerak",
    path: ["conversationId"],
  });

export type CreateReportInput = z.infer<typeof createReportSchema>;
