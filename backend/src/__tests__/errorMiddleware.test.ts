import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import { ZodError, ZodIssue } from "zod";
import { errorHandler, notFoundHandler } from "../middleware/error.middleware";
import { AppError } from "../utils/errors";

function mockReq(overrides = {}): Request {
  return { requestId: "test-req-id", method: "GET", originalUrl: "/test", ...overrides } as any;
}

function mockRes() {
  const res: any = { statusCode: 200 };
  res.status = vi.fn((code: number) => { res.statusCode = code; return res; });
  res.json = vi.fn((body: any) => { res.body = body; return res; });
  return res as Response & { body: any };
}

const noop: NextFunction = () => {};

describe("notFoundHandler", () => {
  it("returns 404 with NOT_FOUND code", () => {
    const res = mockRes();
    notFoundHandler(mockReq(), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});

describe("errorHandler", () => {
  it("handles AppError with correct status and code", () => {
    const res = mockRes();
    const err = new AppError(403, "FORBIDDEN", "Ruxsat yo'q");
    errorHandler(err, mockReq(), res, noop);
    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.error.message).toBe("Ruxsat yo'q");
    expect(res.body.error.requestId).toBe("test-req-id");
  });

  it("handles ZodError with 400 and first issue message", () => {
    const res = mockRes();
    const issue: ZodIssue = { code: "too_small", minimum: 1, inclusive: true, type: "string", path: ["name"], message: "Ism kiritilishi shart" };
    const err = new ZodError([issue]);
    errorHandler(err, mockReq(), res, noop);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.message).toBe("Ism kiritilishi shart");
  });

  it("handles SyntaxError (invalid JSON)", () => {
    const res = mockRes();
    const err = new SyntaxError("Unexpected token");
    (err as any).body = "";
    errorHandler(err, mockReq(), res, noop);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("handles unknown errors with 500", () => {
    const res = mockRes();
    errorHandler(new Error("Something broke"), mockReq(), res, noop);
    expect(res.statusCode).toBe(500);
    expect(res.body.error.code).toBe("INTERNAL_ERROR");
  });

  it("includes requestId in all error responses", () => {
    const res = mockRes();
    errorHandler(new Error("fail"), mockReq({ requestId: "abc-123" }), res, noop);
    expect(res.body.error.requestId).toBe("abc-123");
  });
});
