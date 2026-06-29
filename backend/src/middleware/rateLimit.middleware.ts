import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { logger } from "../utils/logger";

const isTest = process.env.NODE_ENV === "test";

function makeRedisStore(prefix: string): InstanceType<typeof RedisStore> | undefined {
  try {
    const { getRedis } = require("../config/redis");
    const client = getRedis();
    return new RedisStore({
      sendCommand: (...args: string[]) => client.sendCommand(args),
      prefix: `uzchat:rl:${prefix}:`,
    });
  } catch {
    logger.warn(`Redis not available for rate-limit store "${prefix}" — falling back to in-memory`);
    return undefined;
  }
}

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 10000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: isTest ? undefined : makeRedisStore("auth"),
  message: { error: { code: "RATE_LIMITED", message: "Juda ko'p urinish, keyinroq urinib ko'ring" } },
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 10000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: isTest ? undefined : makeRedisStore("login"),
  message: { error: { code: "RATE_LIMITED", message: "Juda ko'p login urinishi. 15 daqiqadan keyin qayta urinib ko'ring" } },
});

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isTest ? 10000 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  store: isTest ? undefined : makeRedisStore("api"),
  message: { error: { code: "RATE_LIMITED", message: "Juda ko'p so'rov, keyinroq urinib ko'ring" } },
});
