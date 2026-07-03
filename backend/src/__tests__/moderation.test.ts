import { describe, it, expect } from "vitest";
import { moderationService } from "../services/moderation.service";

describe("moderationService.check", () => {
  it("allows normal text and empty input", () => {
    expect(moderationService.check("Salom, qalaysiz?").ok).toBe(true);
    expect(moderationService.check("").ok).toBe(true);
    expect(moderationService.check(null).ok).toBe(true);
    expect(moderationService.check(undefined).ok).toBe(true);
  });

  it("blocks severe blocklisted terms", () => {
    const r = moderationService.check("please kill yourself");
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("blocked_term");
  });

  it("catches leetspeak and spacing evasion", () => {
    expect(moderationService.check("k1ll  y0urself now").ok).toBe(false);
    expect(moderationService.check("k.y.s").ok).toBe(false);
  });

  it("rejects link spam beyond the limit", () => {
    const spam = "buy http://a.com http://b.com http://c.com http://d.com";
    const r = moderationService.check(spam);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("too_many_links");
  });

  it("allows a reasonable number of links", () => {
    expect(moderationService.check("see http://a.com and http://b.com").ok).toBe(true);
  });

  it("flags character flooding", () => {
    const r = moderationService.check("a".repeat(40));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("flooding");
  });

  it("checkAll fails if any field is bad", () => {
    expect(moderationService.checkAll("hello", "world").ok).toBe(true);
    expect(moderationService.checkAll("hello", "kill yourself").ok).toBe(false);
  });
});
