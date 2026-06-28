import { describe, it, expect, vi, afterEach } from "vitest";
import { isInQuietHours, isNotificationsPaused } from "../utils/notificationPreferences";

describe("isNotificationsPaused", () => {
  it("returns false when not paused", () => {
    expect(isNotificationsPaused({ notificationsPaused: false, notificationsPausedUntil: null })).toBe(false);
  });

  it("returns true when globally paused", () => {
    expect(isNotificationsPaused({ notificationsPaused: true, notificationsPausedUntil: null })).toBe(true);
  });

  it("returns true when paused until future date", () => {
    const future = new Date(Date.now() + 60_000);
    expect(isNotificationsPaused({ notificationsPaused: false, notificationsPausedUntil: future })).toBe(true);
  });

  it("returns false when paused until past date", () => {
    const past = new Date(Date.now() - 60_000);
    expect(isNotificationsPaused({ notificationsPaused: false, notificationsPausedUntil: past })).toBe(false);
  });
});

describe("isInQuietHours", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns false when quiet hours disabled", () => {
    expect(isInQuietHours({ quietHoursEnabled: false, quietHoursStart: 1320, quietHoursEnd: 420, quietHoursTimezoneOffset: 300 })).toBe(false);
  });

  it("returns false when start/end are null", () => {
    expect(isInQuietHours({ quietHoursEnabled: true, quietHoursStart: null, quietHoursEnd: null, quietHoursTimezoneOffset: 0 })).toBe(false);
  });

  it("returns true when start equals end (24h quiet mode)", () => {
    expect(isInQuietHours({ quietHoursEnabled: true, quietHoursStart: 600, quietHoursEnd: 600, quietHoursTimezoneOffset: 0 })).toBe(true);
  });

  it("handles non-wrapping range (e.g. 22:00 - 07:00 local)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T23:30:00Z"));
    expect(isInQuietHours({ quietHoursEnabled: true, quietHoursStart: 1320, quietHoursEnd: 420, quietHoursTimezoneOffset: 0 })).toBe(true);
    vi.useRealTimers();
  });

  it("returns false when outside quiet hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    expect(isInQuietHours({ quietHoursEnabled: true, quietHoursStart: 1320, quietHoursEnd: 420, quietHoursTimezoneOffset: 0 })).toBe(false);
    vi.useRealTimers();
  });

  it("handles timezone offset correctly", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T18:00:00Z"));
    expect(isInQuietHours({ quietHoursEnabled: true, quietHoursStart: 1320, quietHoursEnd: 420, quietHoursTimezoneOffset: 300 })).toBe(true);
    vi.useRealTimers();
  });

  it("returns null offset as 0", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    const result = isInQuietHours({ quietHoursEnabled: true, quietHoursStart: 600, quietHoursEnd: 780, quietHoursTimezoneOffset: null });
    expect(result).toBe(true);
    vi.useRealTimers();
  });
});
