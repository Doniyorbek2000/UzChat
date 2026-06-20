import { z } from "zod";

export const registerDeviceSchema = z.object({
  deviceId: z.string().min(1).max(128),
  publicKey: z.string().min(1),
  label: z.string().max(64).optional(),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
