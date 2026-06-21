import { apiClient as api } from "./client";

export interface LocationShareData {
  id: string;
  userId: string;
  conversationId: string;
  latitude: number;
  longitude: number;
  isLive: boolean;
  expiresAt: string | null;
  createdAt: string;
  user: { id: string; displayName: string; username: string; avatarUrl: string | null };
}

export const locationSharingApi = {
  share(input: { conversationId: string; latitude: number; longitude: number; isLive?: boolean; durationMinutes?: number }) {
    return api.post<LocationShareData>("/location/share", input).then((r) => r.data);
  },

  updateLive(shareId: string, input: { latitude: number; longitude: number }) {
    return api.patch<LocationShareData>(`/location/${shareId}`, input).then((r) => r.data);
  },

  stopLive(shareId: string) {
    return api.post<LocationShareData>(`/location/${shareId}/stop`).then((r) => r.data);
  },

  getConversationLocations(conversationId: string) {
    return api.get<LocationShareData[]>(`/location/conversations/${conversationId}`).then((r) => r.data);
  },

  getMyLiveLocations() {
    return api.get<LocationShareData[]>("/location/live").then((r) => r.data);
  },
};
