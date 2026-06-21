import { apiClient as api } from "./client";

export interface NearbyPerson {
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
    bio: string | null;
    lastSeenAt: string;
  };
  distance: number;
}

export interface NearbyLocation {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  isVisible: boolean;
  updatedAt: string;
}

export const nearbyApi = {
  updateLocation(input: { latitude: number; longitude: number; accuracy?: number }) {
    return api.put<NearbyLocation>("/nearby/location", input).then((r) => r.data);
  },

  setVisibility(isVisible: boolean) {
    return api.put<NearbyLocation>("/nearby/visibility", { isVisible }).then((r) => r.data);
  },

  findNearby(params: { latitude: number; longitude: number; radiusKm?: number }) {
    return api.get<NearbyPerson[]>("/nearby", { params }).then((r) => r.data);
  },

  hideLocation() {
    return api.delete("/nearby/location");
  },
};
