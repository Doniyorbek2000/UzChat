import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "../utils/logger";

describe("logger", () => {
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logger.info calls console.info", () => {
    logger.info("test message");
    expect(infoSpy).toHaveBeenCalledOnce();
    expect(infoSpy.mock.calls[0][0]).toContain("test message");
  });

  it("logger.error calls console.error", () => {
    logger.error("error occurred", { code: "ERR_TEST" });
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0][0]).toContain("error occurred");
  });

  it("logger.warn calls console.warn", () => {
    logger.warn("warning");
    expect(warnSpy).toHaveBeenCalledOnce();
  });

  it("logger.debug calls console.debug in dev mode", () => {
    logger.debug("debug info");
    expect(debugSpy).toHaveBeenCalledOnce();
  });

  it("includes metadata in output", () => {
    logger.info("with meta", { userId: "abc", action: "login" });
    const output = infoSpy.mock.calls[0][0] as string;
    expect(output).toContain("userId");
    expect(output).toContain("abc");
  });
});
