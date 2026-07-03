import { describe, it, expect, vi, afterEach } from "vitest";
import { formatBirthday, isBirthdayToday, getBirthdayWishText } from "../birthday";
import { stripFormatting, FORMAT_PATTERN } from "../textFormat";
import { formatInviteStatus } from "../inviteLink";

// Pure-logic unit tests. These utils import no React Native modules, so they
// run under vitest directly — the first automated coverage of the mobile app's
// business logic (previously zero).

describe("birthday", () => {
  it("formats a valid birthday", () => {
    expect(formatBirthday(15, 6)).toBe("15-iyun");
    expect(formatBirthday(1, 1)).toBe("1-yanvar");
  });

  it("returns null for missing or invalid input", () => {
    expect(formatBirthday(null, 6)).toBeNull();
    expect(formatBirthday(15, null)).toBeNull();
    expect(formatBirthday(15, 13)).toBeNull();
    expect(formatBirthday(15, 0)).toBeNull();
  });

  it("detects today's birthday", () => {
    const now = new Date();
    expect(isBirthdayToday(now.getDate(), now.getMonth() + 1)).toBe(true);
    expect(isBirthdayToday(now.getDate(), (now.getMonth() + 2) % 12 || 12)).toBe(false);
    expect(isBirthdayToday(null, null)).toBe(false);
  });

  it("builds a wish using the first name", () => {
    expect(getBirthdayWishText("Ali Valiyev")).toContain("Ali");
    expect(getBirthdayWishText("Ali Valiyev")).not.toContain("Valiyev,");
  });
});

describe("textFormat.stripFormatting", () => {
  it("removes inline markers but keeps content", () => {
    expect(stripFormatting("*bold*")).toBe("bold");
    expect(stripFormatting("_italic_")).toBe("italic");
    expect(stripFormatting("~strike~")).toBe("strike");
    expect(stripFormatting("`code`")).toBe("code");
    expect(stripFormatting("||spoiler||")).toBe("spoiler");
  });

  it("leaves arithmetic and space-padded markers alone", () => {
    // Markers must hug non-space content, so these are not formatting.
    expect(stripFormatting("5 * 3 = 15")).toBe("5 * 3 = 15");
    expect(stripFormatting("a _ b")).toBe("a _ b");
  });

  it("handles mixed content", () => {
    expect(stripFormatting("say *hi* to _me_")).toBe("say hi to me");
  });

  afterEach(() => {
    FORMAT_PATTERN.lastIndex = 0; // global regex — reset shared state between cases
  });
});

describe("inviteLink.formatInviteStatus", () => {
  afterEach(() => vi.useRealTimers());

  it("marks permanent links", () => {
    expect(formatInviteStatus(null, null, 0)).toBe("Doimiy");
  });

  it("shows expired links", () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(formatInviteStatus(past, null, 0)).toContain("Muddati tugagan");
  });

  it("shows remaining days and usage", () => {
    const future = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const status = formatInviteStatus(future, 10, 3);
    expect(status).toContain("kundan keyin");
    expect(status).toContain("3/10");
  });
});
