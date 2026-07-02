import { apiClient } from "./client";
import { PreKeyBundle } from "../crypto/e2ee";

export interface DeviceKey {
  id: string;
  deviceId: string;
  publicKey: string;
  label: string | null;
  createdAt: string;
  _count?: { preKeys: number };
  signedPreKey?: { keyId: number; publicKey: string; signature: string } | null;
}

export interface PreKeyUpload {
  preKeys: { keyId: number; publicKey: string }[];
  signedPreKey: { keyId: number; publicKey: string; signature: string };
}

export interface SenderKeyDistribution {
  conversationId: string;
  distributionId: string;
  senderKeyData: string;
}

export interface KeyTransparencyEntry {
  id: string;
  userId: string;
  deviceId: string;
  publicKey: string;
  action: string;
  createdAt: string;
}

export const devicesApi = {
  register(deviceId: string, publicKey: string, label?: string) {
    return apiClient.post<DeviceKey>("/devices", { deviceId, publicKey, label }).then((r) => r.data);
  },

  list() {
    return apiClient.get<DeviceKey[]>("/devices").then((r) => r.data);
  },

  getUserKeys(userId: string) {
    return apiClient.get<{ deviceId: string; publicKey: string }[]>(`/devices/user/${userId}`).then((r) => r.data);
  },

  remove(deviceId: string) {
    return apiClient.delete(`/devices/${deviceId}`).then((r) => r.data);
  },

  uploadPreKeys(deviceId: string, data: PreKeyUpload) {
    return apiClient.post<{ uploaded: number }>(`/devices/${deviceId}/prekeys`, data).then((r) => r.data);
  },

  getPreKeyCount(deviceId: string) {
    return apiClient.get<{ count: number; needsRefill: boolean }>(`/devices/${deviceId}/prekeys/count`).then((r) => r.data);
  },

  getPreKeyBundles(userId: string) {
    return apiClient.get<PreKeyBundle[]>(`/devices/user/${userId}/bundle`).then((r) => r.data);
  },

  getPreKeyBundle(userId: string, deviceId: string) {
    return apiClient.get<PreKeyBundle>(`/devices/user/${userId}/${deviceId}/bundle`).then((r) => r.data);
  },

  distributeSenderKey(deviceId: string, data: SenderKeyDistribution) {
    return apiClient.post<{ distributed: boolean }>(`/devices/${deviceId}/senderkey`, data).then((r) => r.data);
  },

  getSenderKeys(conversationId: string) {
    return apiClient.get(`/devices/senderkeys/${conversationId}`).then((r) => r.data);
  },

  getKeyTransparencyLog(userId: string) {
    return apiClient.get<KeyTransparencyEntry[]>(`/devices/transparency/${userId}`).then((r) => r.data);
  },

  saveKeyBackup(payload: { ciphertext: string; nonce: string; salt: string }) {
    return apiClient.put<{ saved: boolean }>("/devices/key-backup", payload).then((r) => r.data);
  },

  /** Returns null when no backup exists yet. */
  getKeyBackup() {
    return apiClient
      .get<{ ciphertext: string; nonce: string; salt: string; updatedAt: string }>("/devices/key-backup")
      .then((r) => r.data)
      .catch((err) => {
        if (err?.response?.status === 404) return null;
        throw err;
      });
  },

  rotatePublicKey(publicKey: string) {
    return apiClient.post<{ rotated: boolean }>("/devices/rotate-public-key", { publicKey }).then((r) => r.data);
  },
};
