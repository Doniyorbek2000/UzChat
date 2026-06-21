import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import { requestIdMiddleware } from "../middleware/requestId.middleware";

function createMockReq(headers: Record<string, string> = {}): Request {
  return { headers } as any;
}

function createMockRes(): Response {
  const res: any = {};
  res.setHeader = vi.fn();
  return res;
}

describe("requestIdMiddleware", () => {
  it("generates a UUID when X-Request-Id header is absent", () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBeDefined();
    expect(req.requestId).toMatch(/^[0-9a-f]{8}-/);
    expect(res.setHeader).toHaveBeenCalledWith("X-Request-Id", req.requestId);
    expect(next).toHaveBeenCalled();
  });

  it("reuses X-Request-Id from incoming header when valid UUID", () => {
    const existingId = "550e8400-e29b-41d4-a716-446655440000";
    const req = createMockReq({ "x-request-id": existingId });
    const res = createMockRes();
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(req.requestId).toBe(existingId);
    expect(res.setHeader).toHaveBeenCalledWith("X-Request-Id", existingId);
  });

  it("generates a new UUID when X-Request-Id is not a valid UUID", () => {
    const req = createMockReq({ "x-request-id": "malicious-input-<script>" });
    const res = createMockRes();
    const next = vi.fn();

    requestIdMiddleware(req, res, next);

    expect(req.requestId).not.toBe("malicious-input-<script>");
    expect(req.requestId).toMatch(/^[0-9a-f]{8}-/);
  });
});
