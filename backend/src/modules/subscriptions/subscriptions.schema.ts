import { z } from "zod";

export const createSubscriptionSchema = z.object({
  tier: z.enum(["basic", "premium", "vip"]).optional(),
});

export const setupSubscriptionSchema = z.object({
  price: z.number().min(0).max(100000000),
  currency: z.string().min(3).max(3).optional(),
  tiers: z.array(z.object({
    name: z.string().min(1).max(50),
    price: z.number().min(0),
    benefits: z.string().max(500).optional(),
  })).optional(),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;
export type SetupSubscriptionInput = z.infer<typeof setupSubscriptionSchema>;
