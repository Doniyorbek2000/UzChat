import { apiClient as api } from "./client";

export interface ReferralData {
  id: string;
  referrerId: string;
  referredId: string;
  code: string;
  rewardAmount: number;
  rewardClaimed: boolean;
  createdAt: string;
  referred: { id: string; displayName: string; username: string; avatarUrl: string | null };
}

export interface ReferralStats {
  totalReferrals: number;
  totalRewards: number;
}

export const referralsApi = {
  getCode() { return api.get<{ code: string; userId: string }>("/referrals/code").then((r) => r.data); },
  claim(code: string) { return api.post("/referrals/claim", { code }).then((r) => r.data); },
  getMyReferrals() { return api.get<ReferralData[]>("/referrals/mine").then((r) => r.data); },
  getStats() { return api.get<ReferralStats>("/referrals/stats").then((r) => r.data); },
};
