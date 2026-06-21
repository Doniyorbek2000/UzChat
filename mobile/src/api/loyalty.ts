import { apiClient as api } from "./client";

export interface LoyaltyPointsData {
  id: string;
  userId: string;
  points: number;
  level: string;
}

export interface LoyaltyTxn {
  id: string;
  userId: string;
  amount: number;
  type: string;
  reason: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  points: number;
  level: string;
  user: { id: string; displayName: string; username: string; avatarUrl: string | null };
}

export const loyaltyApi = {
  getMyPoints() { return api.get<LoyaltyPointsData>("/loyalty/me").then((r) => r.data); },
  getHistory() { return api.get<LoyaltyTxn[]>("/loyalty/history").then((r) => r.data); },
  getLeaderboard() { return api.get<LeaderboardEntry[]>("/loyalty/leaderboard").then((r) => r.data); },
  spend(amount: number, reason: string) { return api.post("/loyalty/spend", { amount, reason }).then((r) => r.data); },
};
