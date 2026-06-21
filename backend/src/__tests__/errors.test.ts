import { describe, it, expect } from "vitest";
import { AppError, Errors } from "../utils/errors";

describe("AppError", () => {
  it("should create error with status, code, message", () => {
    const err = new AppError(404, "NOT_FOUND", "Test topilmadi");
    expect(err.status).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Test topilmadi");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("Errors factory", () => {
  it("invalidCredentials returns 401", () => {
    const err = Errors.invalidCredentials();
    expect(err.status).toBe(401);
    expect(err.code).toBe("INVALID_CREDENTIALS");
  });

  it("unauthorized returns 401", () => {
    const err = Errors.unauthorized();
    expect(err.status).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
  });

  it("forbidden returns 403 with default message", () => {
    const err = Errors.forbidden();
    expect(err.status).toBe(403);
    expect(err.message).toBe("Ruxsat berilmagan");
  });

  it("forbidden returns 403 with custom message", () => {
    const err = Errors.forbidden("Admin huquqi kerak");
    expect(err.message).toBe("Admin huquqi kerak");
  });

  it("notFound returns 404 with entity name", () => {
    const err = Errors.notFound("Foydalanuvchi");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Foydalanuvchi topilmadi");
  });

  it("badRequest returns 400", () => {
    const err = Errors.badRequest("Noto'g'ri ma'lumot");
    expect(err.status).toBe(400);
    expect(err.code).toBe("BAD_REQUEST");
  });

  it("conflict returns 409", () => {
    const err = Errors.conflict("Allaqachon mavjud");
    expect(err.status).toBe(409);
    expect(err.code).toBe("CONFLICT");
  });

  it("tooManyRequests returns 429", () => {
    const err = Errors.tooManyRequests("Juda ko'p so'rov");
    expect(err.status).toBe(429);
  });
});
