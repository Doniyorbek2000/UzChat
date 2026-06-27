import rateLimit from "express-rate-limit";

const isTest = process.env.NODE_ENV === "test";

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 10000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Juda ko'p urinish, keyinroq urinib ko'ring" } },
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 10000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { code: "RATE_LIMITED", message: "Juda ko'p login urinishi. 15 daqiqadan keyin qayta urinib ko'ring" } },
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isTest ? 10000 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMITED", message: "Juda ko'p so'rov, keyinroq urinib ko'ring" } },
});
