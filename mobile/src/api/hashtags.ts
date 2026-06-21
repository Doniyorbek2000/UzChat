import { apiClient as api } from "./client";

export interface HashtagData {
  id: string;
  tag: string;
  postCount: number;
  createdAt: string;
}

export const hashtagsApi = {
  getTrending() { return api.get<HashtagData[]>("/hashtags/trending").then((r) => r.data); },
  search(q: string) { return api.get<HashtagData[]>("/hashtags/search", { params: { q } }).then((r) => r.data); },
  getPostsByTag(tag: string, cursor?: string) {
    return api.get<{ posts: any[]; nextCursor: string | null }>(`/hashtags/tag/${tag}/posts`, { params: { cursor } }).then((r) => r.data);
  },
};
