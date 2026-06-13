import { z } from "zod";

export const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "Telefon raqam +998901234567 formatida bo'lishi kerak");

export const usernameSchema = z
  .string()
  .min(3, "Username kamida 3 ta belgidan iborat bo'lishi kerak")
  .max(24, "Username 24 ta belgidan oshmasligi kerak")
  .regex(/^[a-zA-Z0-9_]+$/, "Username faqat harf, raqam va '_' belgisidan iborat bo'lishi mumkin");

export const passwordSchema = z
  .string()
  .min(8, "Parol kamida 8 ta belgidan iborat bo'lishi kerak")
  .max(128, "Parol juda uzun");

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().length(6, "Tasdiqlash kodi 6 xonali bo'lishi kerak"),
  username: usernameSchema,
  displayName: z.string().min(1, "Ism kiritilishi shart").max(64),
  password: passwordSchema,
  // base64-encoded X25519 public key generated on-device for E2E encryption
  publicKey: z.string().min(32, "publicKey noto'g'ri"),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Parol kiritilishi shart"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const verifyTwoFactorSchema = z.object({
  pendingToken: z.string().min(1),
  password: z.string().min(1, "Parol kiritilishi shart"),
});

export const requestPhoneChangeSchema = z.object({
  newPhone: phoneSchema,
});

export const verifyPhoneChangeSchema = z.object({
  newPhone: phoneSchema,
  code: z.string().length(6, "Tasdiqlash kodi 6 xonali bo'lishi kerak"),
});

export const requestTwoFactorRecoverySchema = z.object({
  pendingToken: z.string().min(1),
});

export const verifyTwoFactorRecoverySchema = z.object({
  pendingToken: z.string().min(1),
  code: z.string().length(6, "Tasdiqlash kodi 6 xonali bo'lishi kerak"),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type VerifyTwoFactorInput = z.infer<typeof verifyTwoFactorSchema>;
export type RequestPhoneChangeInput = z.infer<typeof requestPhoneChangeSchema>;
export type VerifyPhoneChangeInput = z.infer<typeof verifyPhoneChangeSchema>;
export type RequestTwoFactorRecoveryInput = z.infer<typeof requestTwoFactorRecoverySchema>;
export type VerifyTwoFactorRecoveryInput = z.infer<typeof verifyTwoFactorRecoverySchema>;
