import { apiClient } from "./client";
import { Conversation, Message, MessageReaction, MessageType, ParticipantRole } from "../types";

export interface CreateConversationInput {
  type: "DIRECT" | "GROUP";
  title?: string;
  keySenderPublicKey: string;
  participants: { userId: string; wrappedKey: string; wrappedKeyNonce: string }[];
}

export interface SendMessageInput {
  type: MessageType;
  ciphertext: string;
  nonce: string;
  mediaUrl?: string;
  replyToId?: string;
  mentions?: string[];
}

export const chatsApi = {
  list() {
    return apiClient.get<Conversation[]>("/conversations").then((r) => r.data);
  },

  get(id: string) {
    return apiClient.get<Conversation>(`/conversations/${id}`).then((r) => r.data);
  },

  create(input: CreateConversationInput) {
    return apiClient.post<Conversation>("/conversations", input).then((r) => r.data);
  },

  addParticipant(
    conversationId: string,
    input: { userId: string; wrappedKey: string; wrappedKeyNonce: string; keySenderPublicKey: string }
  ) {
    return apiClient.post<Conversation>(`/conversations/${conversationId}/participants`, input).then((r) => r.data);
  },

  update(conversationId: string, input: { title?: string; avatarUrl?: string }) {
    return apiClient.patch<Conversation>(`/conversations/${conversationId}`, input).then((r) => r.data);
  },

  updatePreferences(
    conversationId: string,
    input: { isPinned?: boolean; isMuted?: boolean; isArchived?: boolean; markedUnread?: boolean }
  ) {
    return apiClient.patch<Conversation>(`/conversations/${conversationId}/preferences`, input).then((r) => r.data);
  },

  removeParticipant(conversationId: string, userId: string) {
    return apiClient.delete<Conversation>(`/conversations/${conversationId}/participants/${userId}`).then((r) => r.data);
  },

  updateParticipantRole(conversationId: string, userId: string, role: ParticipantRole) {
    return apiClient
      .patch<Conversation>(`/conversations/${conversationId}/participants/${userId}/role`, { role })
      .then((r) => r.data);
  },

  leave(conversationId: string) {
    return apiClient.post(`/conversations/${conversationId}/leave`);
  },

  listMessages(conversationId: string, before?: string, limit = 30) {
    return apiClient
      .get<Message[]>(`/conversations/${conversationId}/messages`, { params: { before, limit } })
      .then((r) => r.data);
  },

  sendMessage(conversationId: string, input: SendMessageInput) {
    return apiClient.post<Message>(`/conversations/${conversationId}/messages`, input).then((r) => r.data);
  },

  markRead(conversationId: string) {
    return apiClient.post(`/conversations/${conversationId}/read`);
  },

  deleteMessage(conversationId: string, messageId: string) {
    return apiClient.delete<Message>(`/conversations/${conversationId}/messages/${messageId}`).then((r) => r.data);
  },

  editMessage(conversationId: string, messageId: string, input: { ciphertext: string; nonce: string; mentions?: string[] }) {
    return apiClient.patch<Message>(`/conversations/${conversationId}/messages/${messageId}`, input).then((r) => r.data);
  },

  setReaction(conversationId: string, messageId: string, emoji: string) {
    return apiClient
      .put<{ messageId: string; reactions: MessageReaction[] }>(
        `/conversations/${conversationId}/messages/${messageId}/reactions`,
        { emoji }
      )
      .then((r) => r.data);
  },

  toggleStar(conversationId: string, messageId: string) {
    return apiClient
      .put<{ starred: boolean }>(`/conversations/${conversationId}/messages/${messageId}/star`)
      .then((r) => r.data);
  },

  listStarred() {
    return apiClient.get<Message[]>("/conversations/starred/messages").then((r) => r.data);
  },
};
