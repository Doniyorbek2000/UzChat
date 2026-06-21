import { z } from "zod";

export const createBusinessProfileSchema = z.object({
  businessName: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  workingHours: z.string().max(200).optional(),
  coverUrl: z.string().url().optional(),
  autoReplyMsg: z.string().max(500).optional(),
  greetingMsg: z.string().max(500).optional(),
  catalogEnabled: z.boolean().optional(),
});

export type CreateBusinessProfileInput = z.infer<typeof createBusinessProfileSchema>;
