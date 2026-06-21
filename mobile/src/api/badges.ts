import { apiClient as api } from "./client";

export interface BadgeData {
  id: string;
  userId: string;
  badge: string;
  label: string;
  icon: string;
  earnedAt: string;
}

export interface BadgeDefinition {
  badge: string;
  label: string;
  icon: string;
}

export const badgesApi = {
  getAvailable() { return api.get<BadgeDefinition[]>("/badges/available").then((r) => r.data); },
  getMyBadges() { return api.get<BadgeData[]>("/badges/me").then((r) => r.data); },
  getUserBadges(userId: string) { return api.get<BadgeData[]>(`/badges/user/${userId}`).then((r) => r.data); },
};
