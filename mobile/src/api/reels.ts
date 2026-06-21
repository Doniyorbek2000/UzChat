import { apiClient as api } from "./client";

export interface Reel {
  id: string;
  authorId: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  caption: string | null;
  duration: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  musicTitle: string | null;
  musicArtist: string | null;
  hashtags: string[];
  isPublic: boolean;
  createdAt: string;
  author: { id: string; displayName: string; username: string; avatarUrl: string | null };
  likes?: { id: string }[];
}

export interface ReelComment {
  id: string;
  reelId: string;
  authorId: string;
  text: string;
  parentId: string | null;
  likeCount: number;
  createdAt: string;
  author: { id: string; displayName: string; username: string; avatarUrl: string | null };
  replies?: ReelComment[];
}

export const reelsApi = {
  getFeed(cursor?: string) {
    return api.get<Reel[]>("/reels/feed", { params: { cursor } }).then((r) => r.data);
  },

  getTrending() {
    return api.get<Reel[]>("/reels/trending").then((r) => r.data);
  },

  getByUser(userId: string) {
    return api.get<Reel[]>(`/reels/user/${userId}`).then((r) => r.data);
  },

  create(input: {
    videoUrl: string;
    thumbnailUrl?: string;
    caption?: string;
    duration?: number;
    musicTitle?: string;
    musicArtist?: string;
    hashtags?: string[];
  }) {
    return api.post<Reel>("/reels", input).then((r) => r.data);
  },

  get(reelId: string) {
    return api.get<Reel>(`/reels/${reelId}`).then((r) => r.data);
  },

  view(reelId: string) {
    return api.post(`/reels/${reelId}/view`);
  },

  toggleLike(reelId: string) {
    return api.put<{ liked: boolean }>(`/reels/${reelId}/like`).then((r) => r.data);
  },

  getComments(reelId: string, cursor?: string) {
    return api.get<ReelComment[]>(`/reels/${reelId}/comments`, { params: { cursor } }).then((r) => r.data);
  },

  addComment(reelId: string, input: { text: string; parentId?: string }) {
    return api.post<ReelComment>(`/reels/${reelId}/comments`, input).then((r) => r.data);
  },

  deleteComment(commentId: string) {
    return api.delete(`/reels/comments/${commentId}`);
  },

  delete(reelId: string) {
    return api.delete(`/reels/${reelId}`);
  },
};
