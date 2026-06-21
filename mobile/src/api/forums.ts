import { apiClient as api } from "./client";

export interface ForumTopic {
  id: string;
  conversationId: string;
  title: string;
  iconEmoji: string | null;
  iconColor: string | null;
  creatorId: string;
  isPinned: boolean;
  isClosed: boolean;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  creator?: { id: string; displayName: string; username: string };
}

export const forumsApi = {
  listTopics(conversationId: string) {
    return api.get<ForumTopic[]>(`/forums/conversations/${conversationId}/topics`).then((r) => r.data);
  },

  createTopic(conversationId: string, input: { title: string; iconEmoji?: string; iconColor?: string }) {
    return api.post<ForumTopic>(`/forums/conversations/${conversationId}/topics`, input).then((r) => r.data);
  },

  updateTopic(conversationId: string, topicId: string, input: { title?: string; iconEmoji?: string; iconColor?: string; isPinned?: boolean; isClosed?: boolean }) {
    return api.patch<ForumTopic>(`/forums/conversations/${conversationId}/topics/${topicId}`, input).then((r) => r.data);
  },

  deleteTopic(conversationId: string, topicId: string) {
    return api.delete(`/forums/conversations/${conversationId}/topics/${topicId}`);
  },

  getTopic(topicId: string) {
    return api.get<ForumTopic>(`/forums/topics/${topicId}`).then((r) => r.data);
  },
};
