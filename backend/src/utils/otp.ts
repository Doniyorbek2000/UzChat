import crypto from "crypto";
import bcrypt from "bcryptjs";
import { logger } from "./logger";

const OTP_LENGTH = 6;
export const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute

export function generateOtpCode(): string {
  const max = 10 ** OTP_LENGTH;
  const code = crypto.randomInt(0, max);
  return code.toString().padStart(OTP_LENGTH, "0");
}

export function hashOtpCode(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export function verifyOtpCode(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

/**
 * Sends an SMS with the verification code. In development this just logs
 * the code so the flow can be tested end-to-end without a real SMS
 * provider. Swap this out for Eskiz.uz / Twilio / etc. in production.
 */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  logger.info("OTP SMS sent", { phone, code });
}
