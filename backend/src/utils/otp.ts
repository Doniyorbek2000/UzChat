import crypto from "crypto";
import bcrypt from "bcryptjs";
import { logger } from "./logger";
import { getSmsProvider } from "./smsProviders";

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

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const provider = getSmsProvider();
  try {
    await provider.send(phone, `UzChat tasdiqlash kodi: ${code}`);
  } catch (err) {
    logger.error("Failed to send OTP SMS", { phone: phone.slice(0, -4).replace(/./g, "*") + phone.slice(-4), error: String(err) });
    throw err;
  }
}
