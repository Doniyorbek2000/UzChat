import { apiClient } from "./client";
import { Conversation, InvitePreview, Message, MessageReaction, MessageType, MuteDuration, ParticipantRole, PollVote, RestrictDuration } from "../types";

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
  forwardedFromName?: string;
  // ISO timestamp; if set and in the future, the message is delivered later instead of immediately.
  scheduledFor?: string;
  // "View once" (IMAGE only): media is deleted server-side after the recipient views it.
  viewOnce?: boolean;
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

  update(
    conversationId: string,
    input: {
      title?: string;
      avatarUrl?: string;
      description?: string | null;
      onlyAdminsCanSend?: boolean;
      slowModeSeconds?: number;
    }
  ) {
    return apiClient.patch<Conversation>(`/conversations/${conversationId}`, input).then((r) => r.data);
  },

  updatePreferences(
    conversationId: string,
    input: { isPinned?: boolean; muteFor?: MuteDuration; isArchived?: boolean; markedUnread?: boolean }
  ) {
    return apiClient.patch<Conversation>(`/conversations/${conversationId}/preferences`, input).then((r) => r.data);
  },

  clearHistory(conversationId: string) {
    return apiClient.post(`/conversations/${conversationId}/clear`);
  },

  pinMessage(conversationId: string, messageId: string) {
    return apiClient
      .put<Conversation>(`/conversations/${conversationId}/pinned-messages/${messageId}`)
      .then((r) => r.data);
  },

  unpinMessage(conversationId: string, messageId: string) {
    return apiClient
      .delete<Conversation>(`/conversations/${conversationId}/pinned-messages/${messageId}`)
      .then((r) => r.data);
  },

  setDisappearingMessages(conversationId: string, disappearingSeconds: number | null) {
    return apiClient
      .put<Conversation>(`/conversations/${conversationId}/disappearing-messages`, { disappearingSeconds })
      .then((r) => r.data);
  },

  removeParticipant(conversationId: string, userId: string) {
    return apiClient.delete<Conversation>(`/conversations/${conversationId}/participants/${userId}`).then((r) => r.data);
  },

  updateParticipantRole(conversationId: string, userId: string, role: ParticipantRole) {
    return apiClient
      .patch<Conversation>(`/conversations/${conversationId}/participants/${userId}/role`, { role })
      .then((r) => r.data);
  },

  restrictParticipant(conversationId: string, userId: string, restrictFor: RestrictDuration) {
    return apiClient
      .patch<Conversation>(`/conversations/${conversationId}/participants/${userId}/restrict`, { restrictFor })
      .then((r) => r.data);
  },

  leave(conversationId: string) {
    return apiClient.post(`/conversations/${conversationId}/leave`);
  },

  createInviteLink(conversationId: string) {
    return apiClient.post<{ inviteCode: string }>(`/conversations/${conversationId}/invite-link`).then((r) => r.data);
  },

  revokeInviteLink(conversationId: string) {
    return apiClient.delete(`/conversations/${conversationId}/invite-link`);
  },

  getInvitePreview(code: string) {
    return apiClient.get<InvitePreview>(`/conversations/invite/${code}`).then((r) => r.data);
  },

  joinByInvite(code: string, input: { wrappedKey: string; wrappedKeyNonce: string; keySenderPublicKey: string }) {
    return apiClient.post<Conversation>(`/conversations/invite/${code}/join`, input).then((r) => r.data);
  },

  listMessages(conversationId: string, before?: string, limit = 30) {
    return apiClient
      .get<Message[]>(`/conversations/${conversationId}/messages`, { params: { before, limit } })
      .then((r) => r.data);
  },

  listMedia(conversationId: string, before?: string, limit = 30) {
    return apiClient
      .get<Message[]>(`/conversations/${conversationId}/media`, { params: { before, limit } })
      .then((r) => r.data);
  },

  sendMessage(conversationId: string, input: SendMessageInput) {
    return apiClient.post<Message>(`/conversations/${conversationId}/messages`, input).then((r) => r.data);
  },

  listScheduledMessages(conversationId: string) {
    return apiClient.get<Message[]>(`/conversations/${conversationId}/scheduled-messages`).then((r) => r.data);
  },

  cancelScheduledMessage(conversationId: string, messageId: string) {
    return apiClient.delete(`/conversations/${conversationId}/scheduled-messages/${messageId}`);
  },

  markRead(conversationId: string) {
    return apiClient.post(`/conversations/${conversationId}/read`);
  },

  deleteMessage(conversationId: string, messageId: string) {
    return apiClient.delete<Message>(`/conversations/${conversationId}/messages/${messageId}`).then((r) => r.data);
  },

  hideMessageForMe(conversationId: string, messageId: string) {
    return apiClient.post(`/conversations/${conversationId}/messages/${messageId}/hide`);
  },

  viewMessage(conversationId: string, messageId: string) {
    return apiClient.post<Message>(`/conversations/${conversationId}/messages/${messageId}/view`).then((r) => r.data);
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

  votePoll(conversationId: string, messageId: string, optionIds: string[]) {
    return apiClient
      .put<{ messageId: string; votes: PollVote[] }>(
        `/conversations/${conversationId}/messages/${messageId}/poll-vote`,
        { optionIds }
      )
      .then((r) => r.data);
  },

  listStarred() {
    return apiClient.get<Message[]>("/conversations/starred/messages").then((r) => r.data);
  },
};
