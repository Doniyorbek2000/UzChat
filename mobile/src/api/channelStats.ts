import { apiClient as api } from "./client";

export interface DailyStats {
  id: string;
  conversationId: string;
  date: string;
  memberCount: number;
  messageCount: number;
  viewCount: number;
  shareCount: number;
}

export interface ChannelStatsResponse {
  memberCount: number;
  totalMessages: number;
  messagesThisWeek: number;
  dailyStats: DailyStats[];
}

export const channelStatsApi = {
  getStats(conversationId: string) {
    return api.get<ChannelStatsResponse>(`/conversations/${conversationId}/stats/channel`).then((r) => r.data);
  },
};
