import { logger } from "../utils/logger";

let redisAvailable = false;
let getRedisClient: (() => any) | null = null;

try {
  const mod = require("../config/redis");
  getRedisClient = mod.getRedis;
  redisAvailable = true;
} catch {
  // Redis not initialized yet — will retry on first call
}

function redis(): any {
  if (!getRedisClient) {
    try {
      const mod = require("../config/redis");
      getRedisClient = mod.getRedis;
      redisAvailable = true;
    } catch {
      return null;
    }
  }
  try {
    return getRedisClient!();
  } catch {
    return null;
  }
}

const PREFIX = "uzchat:";
const PRESENCE_TTL = 300;

export const presenceService = {
  async setOnline(userId: string): Promise<void> {
    const r = redis();
    if (!r) return;
    try {
      await r.set(`${PREFIX}online:${userId}`, "1", { EX: PRESENCE_TTL });
    } catch (err) {
      logger.error("Redis presence setOnline failed", { error: String(err) });
    }
  },

  async setOffline(userId: string): Promise<void> {
    const r = redis();
    if (!r) return;
    try {
      await r.del(`${PREFIX}online:${userId}`);
    } catch (err) {
      logger.error("Redis presence setOffline failed", { error: String(err) });
    }
  },

  async isOnline(userId: string): Promise<boolean> {
    const r = redis();
    if (!r) return false;
    try {
      const val = await r.get(`${PREFIX}online:${userId}`);
      return val === "1";
    } catch {
      return false;
    }
  },

  async getOnlineUsers(userIds: string[]): Promise<Set<string>> {
    const r = redis();
    if (!r) return new Set();
    if (userIds.length === 0) return new Set();
    try {
      const keys = userIds.map((id) => `${PREFIX}online:${id}`);
      const values = await r.mGet(keys);
      const online = new Set<string>();
      for (let i = 0; i < userIds.length; i++) {
        if (values[i] === "1") online.add(userIds[i]);
      }
      return online;
    } catch {
      return new Set();
    }
  },

  async refreshTTL(userId: string): Promise<void> {
    const r = redis();
    if (!r) return;
    try {
      await r.expire(`${PREFIX}online:${userId}`, PRESENCE_TTL);
    } catch {}
  },

  async cacheConversationMemberCount(conversationId: string, count: number): Promise<void> {
    const r = redis();
    if (!r) return;
    try {
      await r.set(`${PREFIX}conv:count:${conversationId}`, count.toString(), { EX: 3600 });
    } catch {}
  },

  async getCachedMemberCount(conversationId: string): Promise<number | null> {
    const r = redis();
    if (!r) return null;
    try {
      const val = await r.get(`${PREFIX}conv:count:${conversationId}`);
      return val ? parseInt(val, 10) : null;
    } catch {
      return null;
    }
  },

  async deduplicateMessage(messageId: string): Promise<boolean> {
    const r = redis();
    if (!r) return true;
    try {
      const result = await r.set(`${PREFIX}dedup:${messageId}`, "1", { NX: true, EX: 300 });
      return result !== null;
    } catch {
      return true;
    }
  },

  async cacheUserPublicKey(userId: string, publicKey: string): Promise<void> {
    const r = redis();
    if (!r) return;
    try {
      await r.set(`${PREFIX}pubkey:${userId}`, publicKey, { EX: 86400 });
    } catch {}
  },

  async getCachedPublicKey(userId: string): Promise<string | null> {
    const r = redis();
    if (!r) return null;
    try {
      return await r.get(`${PREFIX}pubkey:${userId}`);
    } catch {
      return null;
    }
  },

  async deduplicateNonce(conversationId: string, nonce: string): Promise<boolean> {
    const r = redis();
    if (!r) return true;
    try {
      const key = `${PREFIX}nonce:${conversationId}:${nonce}`;
      const result = await r.set(key, "1", { NX: true, EX: 3600 });
      return result !== null;
    } catch {
      return true;
    }
  },

  async cacheSessionInfo(userId: string, deviceId: string, info: string): Promise<void> {
    const r = redis();
    if (!r) return;
    try {
      await r.set(`${PREFIX}session:${userId}:${deviceId}`, info, { EX: 86400 });
    } catch {}
  },

  async getCachedSessionInfo(userId: string, deviceId: string): Promise<string | null> {
    const r = redis();
    if (!r) return null;
    try {
      return await r.get(`${PREFIX}session:${userId}:${deviceId}`);
    } catch {
      return null;
    }
  },

  async trackActiveDevices(userId: string, deviceId: string): Promise<void> {
    const r = redis();
    if (!r) return;
    try {
      await r.sAdd(`${PREFIX}active-devices:${userId}`, deviceId);
      await r.expire(`${PREFIX}active-devices:${userId}`, 86400);
    } catch {}
  },

  async getActiveDevices(userId: string): Promise<string[]> {
    const r = redis();
    if (!r) return [];
    try {
      return await r.sMembers(`${PREFIX}active-devices:${userId}`);
    } catch {
      return [];
    }
  },

  async removeActiveDevice(userId: string, deviceId: string): Promise<void> {
    const r = redis();
    if (!r) return;
    try {
      await r.sRem(`${PREFIX}active-devices:${userId}`, deviceId);
    } catch {}
  },
};
