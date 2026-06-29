import { createClient } from "redis";
import { env } from "./env";
import { logger } from "../utils/logger";

export type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | undefined;
let subscriber: RedisClient | undefined;

export function getRedis(): RedisClient {
  if (!client) throw new Error("Redis not initialized — call initRedis() first");
  return client;
}

export function getSubscriber(): RedisClient {
  if (!subscriber) throw new Error("Redis subscriber not initialized");
  return subscriber;
}

export async function initRedis(): Promise<void> {
  client = createClient({ url: env.redis.url });
  subscriber = client.duplicate();

  client.on("error", (err) => logger.error("Redis client error", { error: String(err) }));
  subscriber.on("error", (err) => logger.error("Redis subscriber error", { error: String(err) }));

  await Promise.all([client.connect(), subscriber.connect()]);
  logger.info("Redis connected", { url: env.redis.url });
}

export async function closeRedis(): Promise<void> {
  await Promise.all([
    client?.quit().catch(() => {}),
    subscriber?.quit().catch(() => {}),
  ]);
  client = undefined;
  subscriber = undefined;
}

const PREFIX = env.redis.prefix;

export const redisKeys = {
  userOnline: (userId: string) => `${PREFIX}online:${userId}`,
  userPresence: (userId: string) => `${PREFIX}presence:${userId}`,
  conversationMembers: (convId: string) => `${PREFIX}conv:members:${convId}`,
  conversationMemberCount: (convId: string) => `${PREFIX}conv:count:${convId}`,
  rateLimitMessages: (userId: string) => `${PREFIX}ratelimit:msg:${userId}`,
  rateLimitApi: (key: string) => `${PREFIX}ratelimit:api:${key}`,
  preKeyCount: (userId: string, deviceId: string) => `${PREFIX}prekey:count:${userId}:${deviceId}`,
  senderKey: (convId: string, deviceKeyId: string) => `${PREFIX}senderkey:${convId}:${deviceKeyId}`,
  messageDedup: (msgId: string) => `${PREFIX}dedup:${msgId}`,
  pubsubChannel: (channel: string) => `${PREFIX}pubsub:${channel}`,
} as const;
