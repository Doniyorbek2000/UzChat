import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../utils/password";

describe("password utils", () => {
  it("hashPassword returns a bcrypt hash string", async () => {
    const hash = await hashPassword("TestPass123");
    expect(hash).toMatch(/^\$2[aby]?\$/);
    expect(hash.length).toBeGreaterThan(50);
  });

  it("hashPassword produces different hashes for same input (salted)", async () => {
    const h1 = await hashPassword("SamePass123");
    const h2 = await hashPassword("SamePass123");
    expect(h1).not.toBe(h2);
  });

  it("verifyPassword returns true for correct password", async () => {
    const hash = await hashPassword("Correct123");
    expect(await verifyPassword("Correct123", hash)).toBe(true);
  });

  it("verifyPassword returns false for wrong password", async () => {
    const hash = await hashPassword("Correct123");
    expect(await verifyPassword("Wrong456", hash)).toBe(false);
  });

  it("verifyPassword returns false for empty password against hash", async () => {
    const hash = await hashPassword("Something1");
    expect(await verifyPassword("", hash)).toBe(false);
  });
});
