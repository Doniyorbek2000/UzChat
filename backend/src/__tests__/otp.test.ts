import { describe, it, expect } from "vitest";
import { generateOtpCode, hashOtpCode, verifyOtpCode, OTP_TTL_MS, OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_MS } from "../utils/otp";

describe("OTP utilities", () => {
  it("generates a 6-digit code", () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it("generates different codes on successive calls", () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateOtpCode()));
    expect(codes.size).toBeGreaterThan(1);
  });

  it("pads codes with leading zeros", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateOtpCode();
      expect(code.length).toBe(6);
    }
  });

  it("hashes and verifies a code correctly", async () => {
    const code = "123456";
    const hash = await hashOtpCode(code);
    expect(hash).not.toBe(code);
    expect(await verifyOtpCode(code, hash)).toBe(true);
    expect(await verifyOtpCode("654321", hash)).toBe(false);
  });

  it("produces different hashes for the same code", async () => {
    const code = "123456";
    const hash1 = await hashOtpCode(code);
    const hash2 = await hashOtpCode(code);
    expect(hash1).not.toBe(hash2);
  });

  it("exports correct TTL and max attempts constants", () => {
    expect(OTP_TTL_MS).toBe(5 * 60 * 1000);
    expect(OTP_MAX_ATTEMPTS).toBe(5);
    expect(OTP_RESEND_COOLDOWN_MS).toBe(60 * 1000);
  });
});
