import { secureStorage } from "../storage/secureStorage";
import { devicesApi, PreKeyUpload } from "../api/devices";
import {
  generateKeyPair,
  generatePreKeys,
  generateSignedPreKey,
  PreKeyPair,
  SignedPreKeyPair,
} from "./e2ee";
import * as Crypto from "expo-crypto";

const PREKEY_BATCH_SIZE = 50;
const PREKEY_REFILL_THRESHOLD = 20;

let preKeyCache: Map<number, string> = new Map();

export const keyManager = {
  async initialize(): Promise<{ publicKey: string; deviceId: string }> {
    let keyPair = await secureStorage.getKeyPair();
    if (!keyPair) {
      const newPair = generateKeyPair();
      await secureStorage.setKeyPair(newPair.publicKey, newPair.privateKey);
      keyPair = newPair;
    }

    let deviceId = await secureStorage.getDeviceId();
    if (!deviceId) {
      deviceId = Crypto.randomUUID();
      await secureStorage.setDeviceId(deviceId);
    }

    return { publicKey: keyPair.publicKey, deviceId };
  },

  async registerDevice(label?: string): Promise<void> {
    const { publicKey, deviceId } = await this.initialize();
    await devicesApi.register(deviceId, publicKey, label);
    await this.uploadPreKeysIfNeeded();
  },

  async uploadPreKeysIfNeeded(): Promise<void> {
    const deviceId = await secureStorage.getDeviceId();
    if (!deviceId) return;

    try {
      const { count, needsRefill } = await devicesApi.getPreKeyCount(deviceId);
      if (!needsRefill && count >= PREKEY_REFILL_THRESHOLD) return;
    } catch {
      // Server may not be reachable — generate keys anyway
    }

    const keyPair = await secureStorage.getKeyPair();
    if (!keyPair) return;

    const nextId = await secureStorage.getNextPreKeyId();
    const preKeys = generatePreKeys(nextId, PREKEY_BATCH_SIZE);

    for (const pk of preKeys) {
      preKeyCache.set(pk.keyId, pk.privateKey);
    }

    const signedPreKeyId = (await secureStorage.getSignedPreKeyId()) + 1;
    const signedPreKey = generateSignedPreKey(keyPair.privateKey, signedPreKeyId);

    await secureStorage.setSignedPreKeyPrivate(signedPreKey.privateKey);
    await secureStorage.setSignedPreKeyId(signedPreKeyId);
    await secureStorage.setNextPreKeyId(nextId + PREKEY_BATCH_SIZE);

    const upload: PreKeyUpload = {
      preKeys: preKeys.map((pk) => ({ keyId: pk.keyId, publicKey: pk.publicKey })),
      signedPreKey: {
        keyId: signedPreKey.keyId,
        publicKey: signedPreKey.publicKey,
        signature: signedPreKey.signature,
      },
    };

    await devicesApi.uploadPreKeys(deviceId, upload);
  },

  async getPreKeyPrivate(keyId: number): Promise<string | null> {
    return preKeyCache.get(keyId) ?? null;
  },

  async consumePreKey(keyId: number): Promise<string | null> {
    const key = preKeyCache.get(keyId) ?? null;
    if (key) preKeyCache.delete(keyId);
    return key;
  },

  async getSignedPreKeyPrivate(): Promise<string | null> {
    return secureStorage.getSignedPreKeyPrivate();
  },

  async getDeviceId(): Promise<string | null> {
    return secureStorage.getDeviceId();
  },

  clearCache(): void {
    preKeyCache.clear();
  },
};
