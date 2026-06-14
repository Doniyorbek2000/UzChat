import { apiClient } from "./client";
import { ActivityStats, BannedGroupMember, CommonGroup, Conversation, GroupAuditLogEntry, GroupJoinRequest, InvitePreview, Message, MessageReaction, MessageReminderInfo, MessageType, MuteDuration, ParticipantRole, PollVote, RestrictDuration } from "../types";

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
  forwardedFromUserId?: string;
  // ISO timestamp; if set and in the future, the message is delivered later instead of immediately.
  scheduledFor?: string;
  // "View once" (IMAGE only): media is deleted server-side after the recipient views it.
  viewOnce?: boolean;
  // Media (IMAGE/VIDEO) sent with a blur overlay; tap to reveal.
  isSpoiler?: boolean;
  // POLL only: hides who voted for what from other participants.
  pollAnonymous?: boolean;
  // POLL only: if set, the poll auto-closes this many seconds after creation.
  pollClosesInSeconds?: number;
  // "Send without sound": recipients are notified silently (no notification sound).
  silent?: boolean;
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
      noForwards?: boolean;
      requireAdminApproval?: boolean;
      membersCanAddMembers?: boolean;
      membersCanPinMessages?: boolean;
      membersCanChangeInfo?: boolean;
      membersCanSendMedia?: boolean;
      hideHistoryForNewMembers?: boolean;
      hideMembersList?: boolean;
    }
  ) {
    return apiClient.patch<Conversation>(`/conversations/${conversationId}`, input).then((r) => r.data);
  },

  updatePreferences(
    conversationId: string,
    input: {
      isPinned?: boolean;
      muteFor?: MuteDuration;
      isArchived?: boolean;
      markedUnread?: boolean;
      notificationPreview?: "DEFAULT" | "SHOW" | "HIDE";
      readReceiptsOverride?: "DEFAULT" | "ON" | "OFF";
      mutedSenderIds?: string[];
      autoDeleteAfterSeconds?: number | null;
    }
  ) {
    return apiClient.patch<Conversation>(`/conversations/${conversationId}/preferences`, input).then((r) => r.data);
  },

  reorderPinned(conversationId: string, direction: "up" | "down") {
    return apiClient
      .post<Conversation[]>(`/conversations/${conversationId}/pinned-order`, { direction })
      .then((r) => r.data);
  },

  clearHistory(conversationId: string, olderThanDays?: number) {
    return apiClient.post(`/conversations/${conversationId}/clear`, { olderThanDays });
  },

  deleteConversation(conversationId: string) {
    return apiClient.delete(`/conversations/${conversationId}`);
  },

  deleteConversationForEveryone(conversationId: string) {
    return apiClient.delete(`/conversations/${conversationId}/for-everyone`);
  },

  pinMessage(conversationId: string, messageId: string, expiresInSeconds?: number | null) {
    return apiClient
      .put<Conversation>(`/conversations/${conversationId}/pinned-messages/${messageId}`, { expiresInSeconds })
      .then((r) => r.data);
  },

  unpinMessage(conversationId: string, messageId: string) {
    return apiClient
      .delete<Conversation>(`/conversations/${conversationId}/pinned-messages/${messageId}`)
      .then((r) => r.data);
  },

  unpinAllMessages(conversationId: string) {
    return apiClient.delete<Conversation>(`/conversations/${conversationId}/pinned-messages`).then((r) => r.data);
  },

  setDisappearingMessages(conversationId: string, disappearingSeconds: number | null) {
    return apiClient
      .put<Conversation>(`/conversations/${conversationId}/disappearing-messages`, { disappearingSeconds })
      .then((r) => r.data);
  },

  setNoForwards(conversationId: string, noForwards: boolean) {
    return apiClient.put<Conversation>(`/conversations/${conversationId}/no-forwards`, { noForwards }).then((r) => r.data);
  },

  // WeChat-style "pat on the shoulder": posts a playful system message naming the actor and target.
  pat(conversationId: string, targetUserId: string) {
    return apiClient.post(`/conversations/${conversationId}/pat`, { targetUserId }).then((r) => r.data);
  },

  removeParticipant(conversationId: string, userId: string) {
    return apiClient.delete<Conversation>(`/conversations/${conversationId}/participants/${userId}`).then((r) => r.data);
  },

  banParticipant(conversationId: string, userId: string) {
    return apiClient.post<Conversation>(`/conversations/${conversationId}/participants/${userId}/ban`).then((r) => r.data);
  },

  listBannedUsers(conversationId: string) {
    return apiClient.get<BannedGroupMember[]>(`/conversations/${conversationId}/bans`).then((r) => r.data);
  },

  unbanUser(conversationId: string, userId: string) {
    return apiClient.delete(`/conversations/${conversationId}/bans/${userId}`);
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

  updateParticipantCustomTitle(conversationId: string, userId: string, customTitle: string | null) {
    return apiClient
      .patch<Conversation>(`/conversations/${conversationId}/participants/${userId}/title`, { customTitle })
      .then((r) => r.data);
  },

  leave(conversationId: string) {
    return apiClient.post(`/conversations/${conversationId}/leave`);
  },

  createInviteLink(conversationId: string, options?: { expiresInSeconds?: number | null; maxUses?: number | null }) {
    return apiClient
      .post<{ inviteCode: string; inviteCodeExpiresAt: string | null; inviteCodeMaxUses: number | null; inviteCodeUseCount: number }>(
        `/conversations/${conversationId}/invite-link`,
        options ?? {}
      )
      .then((r) => r.data);
  },

  revokeInviteLink(conversationId: string) {
    return apiClient.delete(`/conversations/${conversationId}/invite-link`);
  },

  getInvitePreview(code: string) {
    return apiClient.get<InvitePreview>(`/conversations/invite/${code}`).then((r) => r.data);
  },

  joinByInvite(code: string, input: { wrappedKey: string; wrappedKeyNonce: string; keySenderPublicKey: string }) {
    return apiClient
      .post<Conversation | { pending: true }>(`/conversations/invite/${code}/join`, input)
      .then((r) => r.data);
  },

  listJoinRequests(conversationId: string) {
    return apiClient.get<GroupJoinRequest[]>(`/conversations/${conversationId}/join-requests`).then((r) => r.data);
  },

  approveJoinRequest(conversationId: string, requestId: string) {
    return apiClient
      .post<Conversation>(`/conversations/${conversationId}/join-requests/${requestId}/approve`)
      .then((r) => r.data);
  },

  declineJoinRequest(conversationId: string, requestId: string) {
    return apiClient.post(`/conversations/${conversationId}/join-requests/${requestId}/decline`);
  },

  getAuditLog(conversationId: string, before?: string) {
    return apiClient
      .get<GroupAuditLogEntry[]>(`/conversations/${conversationId}/audit-log`, { params: { before } })
      .then((r) => r.data);
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

  getStats(conversationId: string) {
    return apiClient
      .get<{
        total: number;
        media: number;
        voice: number;
        files: number;
        topSenders?: { userId: string; count: number }[];
        byWeekday?: number[];
        topReactedMessages?: { message: Message; reactionCount: number }[];
      }>(`/conversations/${conversationId}/stats`)
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

  rescheduleMessage(conversationId: string, messageId: string, scheduledFor: string) {
    return apiClient
      .patch<Message>(`/conversations/${conversationId}/scheduled-messages/${messageId}`, { scheduledFor })
      .then((r) => r.data);
  },

  sendScheduledMessageNow(conversationId: string, messageId: string) {
    return apiClient
      .post<Message>(`/conversations/${conversationId}/scheduled-messages/${messageId}/send-now`)
      .then((r) => r.data);
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

  getEditHistory(conversationId: string, messageId: string) {
    return apiClient
      .get<{ ciphertext: string; nonce: string; editedAt: string }[]>(
        `/conversations/${conversationId}/messages/${messageId}/history`
      )
      .then((r) => r.data);
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

  closePoll(conversationId: string, messageId: string) {
    return apiClient
      .put<{ messageId: string; pollClosedAt: string }>(`/conversations/${conversationId}/messages/${messageId}/poll-close`)
      .then((r) => r.data);
  },

  listStarred() {
    return apiClient.get<Message[]>("/conversations/starred/messages").then((r) => r.data);
  },

  listMentions() {
    return apiClient.get<Message[]>("/conversations/mentions/messages").then((r) => r.data);
  },

  setReminder(conversationId: string, messageId: string, remindInSeconds: number) {
    return apiClient
      .put<{ remindAt: string }>(`/conversations/${conversationId}/messages/${messageId}/reminder`, { remindInSeconds })
      .then((r) => r.data);
  },

  cancelReminder(conversationId: string, messageId: string) {
    return apiClient.delete(`/conversations/${conversationId}/messages/${messageId}/reminder`);
  },

  listReminders() {
    return apiClient.get<MessageReminderInfo[]>("/conversations/reminders/messages").then((r) => r.data);
  },

  listCommonGroups(userId: string) {
    return apiClient.get<CommonGroup[]>(`/conversations/common-groups/${userId}`).then((r) => r.data);
  },

  getMyActivityStats() {
    return apiClient.get<ActivityStats>("/conversations/me/activity-stats").then((r) => r.data);
  },
};
