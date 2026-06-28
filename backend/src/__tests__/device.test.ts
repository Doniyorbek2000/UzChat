import { describe, it, expect } from "vitest";
import { formatDeviceName } from "../utils/device";

describe("formatDeviceName", () => {
  it("returns 'noma'lum qurilma' for null", () => {
    expect(formatDeviceName(null)).toBe("noma'lum qurilma");
  });

  it("returns 'noma'lum qurilma' for undefined", () => {
    expect(formatDeviceName(undefined)).toBe("noma'lum qurilma");
  });

  it("returns 'noma'lum qurilma' for empty string", () => {
    expect(formatDeviceName("")).toBe("noma'lum qurilma");
  });

  it("detects Android", () => {
    expect(formatDeviceName("Mozilla/5.0 (Linux; Android 13; Pixel 7)")).toBe("Android qurilma");
  });

  it("detects Dalvik (Android runtime)", () => {
    expect(formatDeviceName("Dalvik/2.1.0 (Linux; U; Android 12)")).toBe("Android qurilma");
  });

  it("detects iPhone", () => {
    expect(formatDeviceName("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("iPhone");
  });

  it("detects iPad", () => {
    expect(formatDeviceName("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("iPad");
  });

  it("detects Mac", () => {
    expect(formatDeviceName("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)")).toBe("Mac");
  });

  it("detects Windows", () => {
    expect(formatDeviceName("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("Windows");
  });

  it("detects Linux", () => {
    expect(formatDeviceName("Mozilla/5.0 (X11; Linux x86_64)")).toBe("Linux");
  });

  it("returns unknown for unrecognized user-agent", () => {
    expect(formatDeviceName("curl/7.88.1")).toBe("noma'lum qurilma");
  });
});
