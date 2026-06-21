import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validateBody, validateQuery } from "../utils/validate";

function createMockReq(body: any = {}, query: any = {}): Request {
  return { body, query } as any;
}

function createMockRes(): Response {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("validateBody", () => {
  const schema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  it("passes valid body to next()", () => {
    const req = createMockReq({ name: "Test", age: 25 });
    const res = createMockRes();
    const next = vi.fn();

    validateBody(schema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body.name).toBe("Test");
  });

  it("returns 400 for invalid body", () => {
    const req = createMockReq({ name: "", age: -1 });
    const res = createMockRes();
    const next = vi.fn();

    validateBody(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "VALIDATION_ERROR" }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 for missing required fields", () => {
    const req = createMockReq({});
    const res = createMockRes();
    const next = vi.fn();

    validateBody(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("validateQuery", () => {
  const schema = z.object({
    cursor: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }).passthrough();

  it("passes valid query to next()", () => {
    const req = createMockReq({}, { limit: "50" });
    const res = createMockRes();
    const next = vi.fn();

    validateQuery(schema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.query.limit).toBe(50);
  });

  it("returns 400 for invalid cursor", () => {
    const req = createMockReq({}, { cursor: "not-a-uuid" });
    const res = createMockRes();
    const next = vi.fn();

    validateQuery(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it("uses default limit when not provided", () => {
    const req = createMockReq({}, {});
    const res = createMockRes();
    const next = vi.fn();

    validateQuery(schema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.query.limit).toBe(20);
  });
});
