import { z } from "zod";

export const registerDeviceSchema = z.object({
  deviceId: z.string().min(1).max(128),
  publicKey: z.string().min(1),
  label: z.string().max(64).optional(),
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;

const preKeySchema = z.object({
  keyId: z.number().int().min(0),
  publicKey: z.string().min(1),
});

export const uploadPreKeysSchema = z.object({
  preKeys: z.array(preKeySchema).min(1).max(100),
  signedPreKey: z.object({
    keyId: z.number().int().min(0),
    publicKey: z.string().min(1),
    signature: z.string().min(1),
  }),
});

export type UploadPreKeysInput = z.infer<typeof uploadPreKeysSchema>;

export const distributeSenderKeySchema = z.object({
  conversationId: z.string().uuid(),
  distributionId: z.string().min(1),
  senderKeyData: z.string().min(1),
});

export type DistributeSenderKeyInput = z.infer<typeof distributeSenderKeySchema>;
