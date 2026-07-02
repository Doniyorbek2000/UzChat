import { apiClient as api } from "./client";

export interface SearchResult {
  users?: Array<{ id: string; displayName: string; username: string; avatarUrl: string | null; bio: string | null; isVerified: boolean; verifiedType: string | null }>;
  groups?: Array<{ id: string; title: string | null; avatarUrl: string | null; type: string; createdAt: string; _count: { participants: number } }>;
  channels?: Array<{ id: string; title: string | null; avatarUrl: string | null; type: string; createdAt: string; _count: { participants: number } }>;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  type: string;
  createdAt: string;
}

export const searchApi = {
  search(q: string, type?: "users" | "groups" | "channels") {
    const params: any = { q };
    if (type) params.type = type;
    return api.get<SearchResult>("/search", { params }).then((r) => r.data);
  },

  getHistory() {
    return api.get<SearchHistoryItem[]>("/search/history").then((r) => r.data);
  },

  clearHistory() {
    return api.delete("/search/history");
  },
};
