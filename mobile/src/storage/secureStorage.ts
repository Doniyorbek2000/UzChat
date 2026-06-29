import * as SecureStore from "expo-secure-store";

const KEYS = {
  accessToken: "uzchat.accessToken",
  refreshToken: "uzchat.refreshToken",
  privateKey: "uzchat.e2ee.privateKey",
  publicKey: "uzchat.e2ee.publicKey",
  appLockPinHash: "uzchat.appLock.pinHash",
  signedPreKeyPrivate: "uzchat.e2ee.signedPreKey.private",
  signedPreKeyId: "uzchat.e2ee.signedPreKey.id",
  preKeyNextId: "uzchat.e2ee.preKey.nextId",
  deviceId: "uzchat.e2ee.deviceId",
} as const;

export const secureStorage = {
  async getTokens() {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(KEYS.accessToken),
      SecureStore.getItemAsync(KEYS.refreshToken),
    ]);
    return { accessToken, refreshToken };
  },

  async setTokens(accessToken: string, refreshToken: string) {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.accessToken, accessToken),
      SecureStore.setItemAsync(KEYS.refreshToken, refreshToken),
    ]);
  },

  async clearTokens() {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.accessToken),
      SecureStore.deleteItemAsync(KEYS.refreshToken),
    ]);
  },

  /** The E2EE keypair is tied to this device and survives logout. */
  async getKeyPair() {
    const [publicKey, privateKey] = await Promise.all([
      SecureStore.getItemAsync(KEYS.publicKey),
      SecureStore.getItemAsync(KEYS.privateKey),
    ]);
    if (!publicKey || !privateKey) return null;
    return { publicKey, privateKey };
  },

  async setKeyPair(publicKey: string, privateKey: string) {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.publicKey, publicKey),
      SecureStore.setItemAsync(KEYS.privateKey, privateKey, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    ]);
  },

  async clearKeyPair() {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.publicKey),
      SecureStore.deleteItemAsync(KEYS.privateKey),
    ]);
  },

  /** SHA-256 hash of the app-lock PIN, or null if app lock is not configured. */
  async getAppLockPinHash() {
    return SecureStore.getItemAsync(KEYS.appLockPinHash);
  },

  async setAppLockPinHash(hash: string) {
    await SecureStore.setItemAsync(KEYS.appLockPinHash, hash);
  },

  async clearAppLockPinHash() {
    await SecureStore.deleteItemAsync(KEYS.appLockPinHash);
  },

  async getDeviceId() {
    return SecureStore.getItemAsync(KEYS.deviceId);
  },

  async setDeviceId(id: string) {
    await SecureStore.setItemAsync(KEYS.deviceId, id);
  },

  async getSignedPreKeyPrivate() {
    return SecureStore.getItemAsync(KEYS.signedPreKeyPrivate);
  },

  async setSignedPreKeyPrivate(key: string) {
    await SecureStore.setItemAsync(KEYS.signedPreKeyPrivate, key, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },

  async getSignedPreKeyId() {
    const val = await SecureStore.getItemAsync(KEYS.signedPreKeyId);
    return val ? parseInt(val, 10) : 0;
  },

  async setSignedPreKeyId(id: number) {
    await SecureStore.setItemAsync(KEYS.signedPreKeyId, id.toString());
  },

  async getNextPreKeyId() {
    const val = await SecureStore.getItemAsync(KEYS.preKeyNextId);
    return val ? parseInt(val, 10) : 1;
  },

  async setNextPreKeyId(id: number) {
    await SecureStore.setItemAsync(KEYS.preKeyNextId, id.toString());
  },
};
