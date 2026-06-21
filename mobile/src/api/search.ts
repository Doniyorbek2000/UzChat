import { apiClient as api } from "./client";

export interface SearchResult {
  users?: Array<{ id: string; displayName: string; username: string; avatarUrl: string | null; bio: string | null; isVerified: boolean }>;
  groups?: Array<{ id: string; name: string | null; avatarUrl: string | null; type: string; _count: { participants: number } }>;
  channels?: Array<{ id: string; name: string | null; avatarUrl: string | null; type: string; _count: { participants: number } }>;
  messages?: Array<{ id: string; conversationId: string; type: string; ciphertext: string; createdAt: string; sender: { id: string; displayName: string }; conversation: { id: string; name: string | null; type: string } }>;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  type: string;
  createdAt: string;
}

export const searchApi = {
  search(q: string, type?: "messages" | "users" | "groups" | "channels", conversationId?: string) {
    const params: any = { q };
    if (type) params.type = type;
    if (conversationId) params.conversationId = conversationId;
    return api.get<SearchResult>("/search", { params }).then((r) => r.data);
  },

  getHistory() {
    return api.get<SearchHistoryItem[]>("/search/history").then((r) => r.data);
  },

  clearHistory() {
    return api.delete("/search/history");
  },
};
