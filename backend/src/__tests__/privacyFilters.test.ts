import { describe, it, expect } from "vitest";
import { filterLastSeen, filterAvatar, filterBio, filterBirthday } from "../utils/lastSeen";

const now = new Date("2024-06-15T12:00:00Z");

describe("filterLastSeen", () => {
  it("always shows own lastSeenAt regardless of privacy", () => {
    const user = { id: "u1", lastSeenAt: now, lastSeenPrivacy: "NOBODY" as const };
    const result = filterLastSeen("u1", user, new Set());
    expect(result.lastSeenAt).toEqual(now);
    expect(result).not.toHaveProperty("lastSeenPrivacy");
  });

  it("shows lastSeenAt when privacy is EVERYONE", () => {
    const user = { id: "u2", lastSeenAt: now, lastSeenPrivacy: "EVERYONE" as const };
    const result = filterLastSeen("u1", user, new Set());
    expect(result.lastSeenAt).toEqual(now);
  });

  it("hides lastSeenAt when privacy is NOBODY", () => {
    const user = { id: "u2", lastSeenAt: now, lastSeenPrivacy: "NOBODY" as const };
    const result = filterLastSeen("u1", user, new Set());
    expect(result.lastSeenAt).toBeNull();
  });

  it("shows lastSeenAt when privacy is CONTACTS and viewer is contact", () => {
    const user = { id: "u2", lastSeenAt: now, lastSeenPrivacy: "CONTACTS" as const };
    const result = filterLastSeen("u1", user, new Set(["u2"]));
    expect(result.lastSeenAt).toEqual(now);
  });

  it("hides lastSeenAt when privacy is CONTACTS and viewer is not contact", () => {
    const user = { id: "u2", lastSeenAt: now, lastSeenPrivacy: "CONTACTS" as const };
    const result = filterLastSeen("u1", user, new Set(["u3"]));
    expect(result.lastSeenAt).toBeNull();
  });

  it("ALLOW exception overrides NOBODY", () => {
    const user = { id: "u2", lastSeenAt: now, lastSeenPrivacy: "NOBODY" as const };
    const exceptions = new Map([["u2", "ALLOW" as const]]);
    const result = filterLastSeen("u1", user, new Set(), exceptions);
    expect(result.lastSeenAt).toEqual(now);
  });

  it("DENY exception overrides EVERYONE", () => {
    const user = { id: "u2", lastSeenAt: now, lastSeenPrivacy: "EVERYONE" as const };
    const exceptions = new Map([["u2", "DENY" as const]]);
    const result = filterLastSeen("u1", user, new Set(), exceptions);
    expect(result.lastSeenAt).toBeNull();
  });

  it("strips lastSeenPrivacy from result", () => {
    const user = { id: "u2", lastSeenAt: now, lastSeenPrivacy: "EVERYONE" as const };
    const result = filterLastSeen("u1", user, new Set());
    expect(result).not.toHaveProperty("lastSeenPrivacy");
  });
});

describe("filterAvatar", () => {
  it("shows own avatar regardless of privacy", () => {
    const user = { id: "u1", avatarUrl: "https://img.com/1.jpg", avatarPrivacy: "NOBODY" as const };
    const result = filterAvatar("u1", user, new Set());
    expect(result.avatarUrl).toBe("https://img.com/1.jpg");
  });

  it("hides avatar when privacy is NOBODY", () => {
    const user = { id: "u2", avatarUrl: "https://img.com/1.jpg", avatarPrivacy: "NOBODY" as const };
    const result = filterAvatar("u1", user, new Set());
    expect(result.avatarUrl).toBeNull();
  });

  it("shows avatar when privacy is CONTACTS and viewer is contact", () => {
    const user = { id: "u2", avatarUrl: "https://img.com/1.jpg", avatarPrivacy: "CONTACTS" as const };
    const result = filterAvatar("u1", user, new Set(["u2"]));
    expect(result.avatarUrl).toBe("https://img.com/1.jpg");
  });

  it("hides avatar when privacy is CONTACTS and viewer is not contact", () => {
    const user = { id: "u2", avatarUrl: "https://img.com/1.jpg", avatarPrivacy: "CONTACTS" as const };
    const result = filterAvatar("u1", user, new Set());
    expect(result.avatarUrl).toBeNull();
  });

  it("strips avatarPrivacy from result", () => {
    const user = { id: "u2", avatarUrl: "a.jpg", avatarPrivacy: "EVERYONE" as const };
    const result = filterAvatar("u1", user, new Set());
    expect(result).not.toHaveProperty("avatarPrivacy");
  });
});

describe("filterBio", () => {
  it("shows own bio regardless of privacy", () => {
    const user = { id: "u1", bio: "Hello", bioPrivacy: "NOBODY" as const };
    const result = filterBio("u1", user, new Set());
    expect(result.bio).toBe("Hello");
  });

  it("hides bio when privacy is NOBODY", () => {
    const user = { id: "u2", bio: "Hello", bioPrivacy: "NOBODY" as const };
    const result = filterBio("u1", user, new Set());
    expect(result.bio).toBeNull();
  });

  it("shows bio when privacy is CONTACTS and viewer is contact", () => {
    const user = { id: "u2", bio: "Hello", bioPrivacy: "CONTACTS" as const };
    const result = filterBio("u1", user, new Set(["u2"]));
    expect(result.bio).toBe("Hello");
  });

  it("strips bioPrivacy from result", () => {
    const user = { id: "u2", bio: "Hello", bioPrivacy: "EVERYONE" as const };
    const result = filterBio("u1", user, new Set());
    expect(result).not.toHaveProperty("bioPrivacy");
  });
});

describe("filterBirthday", () => {
  it("shows own birthday regardless of privacy", () => {
    const user = { id: "u1", birthdayDay: 15, birthdayMonth: 6, birthdayPrivacy: "NOBODY" as const };
    const result = filterBirthday("u1", user, new Set());
    expect(result.birthdayDay).toBe(15);
    expect(result.birthdayMonth).toBe(6);
  });

  it("hides birthday when privacy is NOBODY", () => {
    const user = { id: "u2", birthdayDay: 15, birthdayMonth: 6, birthdayPrivacy: "NOBODY" as const };
    const result = filterBirthday("u1", user, new Set());
    expect(result.birthdayDay).toBeNull();
    expect(result.birthdayMonth).toBeNull();
  });

  it("shows birthday when privacy is CONTACTS and viewer is contact", () => {
    const user = { id: "u2", birthdayDay: 15, birthdayMonth: 6, birthdayPrivacy: "CONTACTS" as const };
    const result = filterBirthday("u1", user, new Set(["u2"]));
    expect(result.birthdayDay).toBe(15);
    expect(result.birthdayMonth).toBe(6);
  });

  it("hides birthday when privacy is CONTACTS and viewer is not contact", () => {
    const user = { id: "u2", birthdayDay: 15, birthdayMonth: 6, birthdayPrivacy: "CONTACTS" as const };
    const result = filterBirthday("u1", user, new Set());
    expect(result.birthdayDay).toBeNull();
    expect(result.birthdayMonth).toBeNull();
  });

  it("strips birthdayPrivacy from result", () => {
    const user = { id: "u2", birthdayDay: 1, birthdayMonth: 1, birthdayPrivacy: "EVERYONE" as const };
    const result = filterBirthday("u1", user, new Set());
    expect(result).not.toHaveProperty("birthdayPrivacy");
  });
});
