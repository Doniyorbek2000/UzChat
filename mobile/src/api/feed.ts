import { apiClient as api } from "./client";

export interface FeedUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface Post {
  id: string;
  userId: string;
  content: string | null;
  mediaUrls: string[];
  visibility: "PUBLIC" | "CONTACTS" | "PRIVATE";
  createdAt: string;
  user: FeedUser;
  isLiked: boolean;
  _count: { likes: number; comments: number };
}

export interface PostComment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: FeedUser;
}

export const feedApi = {
  async getFeed(cursor?: string): Promise<{ posts: Post[]; nextCursor: string | null }> {
    const params = cursor ? `?cursor=${cursor}` : "";
    const res = await api.get(`/feed${params}`);
    return res.data;
  },

  async getUserPosts(userId: string, cursor?: string): Promise<{ posts: Post[]; nextCursor: string | null }> {
    const params = cursor ? `?cursor=${cursor}` : "";
    const res = await api.get(`/feed/user/${userId}${params}`);
    return res.data;
  },

  async createPost(data: { content?: string; mediaUrls?: string[]; visibility?: string }): Promise<Post> {
    const res = await api.post("/feed", data);
    return res.data;
  },

  async likePost(postId: string): Promise<void> {
    await api.post(`/feed/${postId}/like`);
  },

  async unlikePost(postId: string): Promise<void> {
    await api.delete(`/feed/${postId}/like`);
  },

  async getComments(postId: string, cursor?: string): Promise<{ comments: PostComment[]; nextCursor: string | null }> {
    const params = cursor ? `?cursor=${cursor}` : "";
    const res = await api.get(`/feed/${postId}/comments${params}`);
    return res.data;
  },

  async addComment(postId: string, content: string): Promise<PostComment> {
    const res = await api.post(`/feed/${postId}/comments`, { content });
    return res.data;
  },

  async deletePost(postId: string): Promise<void> {
    await api.delete(`/feed/${postId}`);
  },

  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/feed/comments/${commentId}`);
  },
};
