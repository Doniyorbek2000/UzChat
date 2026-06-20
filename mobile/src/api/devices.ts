import { apiClient } from "./client";

export interface DeviceKey {
  id: string;
  deviceId: string;
  publicKey: string;
  label: string | null;
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
};
