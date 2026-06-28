import { describe, it, expect } from "vitest";
import { phoneSchema, usernameSchema, passwordSchema, loginSchema, verifyOtpSchema } from "../modules/auth/auth.schema";

describe("Auth schemas", () => {
  describe("phoneSchema", () => {
    it("accepts valid Uzbek phone", () => {
      expect(phoneSchema.safeParse("+998901234567").success).toBe(true);
    });

    it("accepts other international phones", () => {
      expect(phoneSchema.safeParse("+12025551234").success).toBe(true);
    });

    it("rejects phone without +", () => {
      expect(phoneSchema.safeParse("998901234567").success).toBe(false);
    });

    it("rejects too short phone", () => {
      expect(phoneSchema.safeParse("+1234567").success).toBe(false);
    });

    it("rejects phone starting with +0", () => {
      expect(phoneSchema.safeParse("+098901234567").success).toBe(false);
    });
  });

  describe("usernameSchema", () => {
    it("accepts valid username", () => {
      expect(usernameSchema.safeParse("aziz_123").success).toBe(true);
    });

    it("rejects too short username", () => {
      expect(usernameSchema.safeParse("ab").success).toBe(false);
    });

    it("rejects too long username", () => {
      expect(usernameSchema.safeParse("a".repeat(25)).success).toBe(false);
    });

    it("rejects special characters", () => {
      expect(usernameSchema.safeParse("user@name").success).toBe(false);
    });

    it("accepts underscores", () => {
      expect(usernameSchema.safeParse("my_user_name").success).toBe(true);
    });
  });

  describe("passwordSchema", () => {
    it("accepts valid password", () => {
      expect(passwordSchema.safeParse("MyPassword1!").success).toBe(true);
    });

    it("rejects password without uppercase", () => {
      expect(passwordSchema.safeParse("mypassword1").success).toBe(false);
    });

    it("rejects password without lowercase", () => {
      expect(passwordSchema.safeParse("MYPASSWORD1").success).toBe(false);
    });

    it("rejects password without digit", () => {
      expect(passwordSchema.safeParse("MyPasswordAbc").success).toBe(false);
    });

    it("rejects password under 10 chars", () => {
      expect(passwordSchema.safeParse("MyPass1").success).toBe(false);
    });

    it("accepts 10+ char password with all requirements", () => {
      expect(passwordSchema.safeParse("SecurePass99!").success).toBe(true);
    });

    it("rejects password without special character", () => {
      expect(passwordSchema.safeParse("SecurePass99").success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("accepts valid login", () => {
      const result = loginSchema.safeParse({ phone: "+998901234567", password: "test" });
      expect(result.success).toBe(true);
    });

    it("rejects missing password", () => {
      const result = loginSchema.safeParse({ phone: "+998901234567" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid phone", () => {
      const result = loginSchema.safeParse({ phone: "invalid", password: "test" });
      expect(result.success).toBe(false);
    });
  });

  describe("verifyOtpSchema", () => {
    it("accepts valid OTP verification", () => {
      const result = verifyOtpSchema.safeParse({
        phone: "+998901234567",
        code: "123456",
        username: "testuser",
        displayName: "Test User",
        password: "MyPassword1!",
        publicKey: "a".repeat(44),
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-6-digit code", () => {
      const result = verifyOtpSchema.safeParse({
        phone: "+998901234567",
        code: "12345",
        username: "testuser",
        displayName: "Test",
        password: "MyPassword1!",
        publicKey: "a".repeat(44),
      });
      expect(result.success).toBe(false);
    });

    it("trims displayName", () => {
      const result = verifyOtpSchema.safeParse({
        phone: "+998901234567",
        code: "123456",
        username: "testuser",
        displayName: "  Test User  ",
        password: "MyPassword1!",
        publicKey: "a".repeat(44),
      });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.displayName).toBe("Test User");
    });
  });
});
