import { apiClient } from "./client";
import { AuthUser, GroupAddPrivacy, LastSeenException, LastSeenPrivacy, MessagePrivacy, User, UsernameHistoryEntry } from "../types";

export const usersApi = {
  me() {
    return apiClient.get<AuthUser>("/users/me").then((r) => r.data);
  },

  updateMe(data: {
    username?: string;
    displayName?: string;
    bio?: string;
    customStatus?: string;
    customStatusClearAfterSeconds?: number | null;
    avatarUrl?: string;
    lastSeenPrivacy?: LastSeenPrivacy;
    avatarPrivacy?: LastSeenPrivacy;
    bioPrivacy?: LastSeenPrivacy;
    birthdayDay?: number | null;
    birthdayMonth?: number | null;
    birthdayPrivacy?: LastSeenPrivacy;
    groupAddPrivacy?: GroupAddPrivacy;
    messagePrivacy?: MessagePrivacy;
    phoneNumberPrivacy?: LastSeenPrivacy;
    readReceiptsEnabled?: boolean;
    typingIndicatorsEnabled?: boolean;
    notifyPrivateChats?: boolean;
    notifyGroupChats?: boolean;
    notifyReactions?: boolean;
    notifyMentions?: boolean;
    hideNotificationContent?: boolean;
    quietHoursEnabled?: boolean;
    quietHoursStart?: number | null;
    quietHoursEnd?: number | null;
    quietHoursTimezoneOffset?: number | null;
    defaultDisappearingSeconds?: number | null;
  }) {
    return apiClient.patch<AuthUser>("/users/me", data).then((r) => r.data);
  },

  getUsernameHistory() {
    return apiClient.get<UsernameHistoryEntry[]>("/users/me/username-history").then((r) => r.data);
  },

  search(query: string) {
    return apiClient.get<User[]>("/users/search", { params: { q: query } }).then((r) => r.data);
  },

  getById(id: string) {
    return apiClient.get<User>(`/users/${id}`).then((r) => r.data);
  },

  notifyOnline(id: string) {
    return apiClient.post(`/users/${id}/notify-online`);
  },

  cancelNotifyOnline(id: string) {
    return apiClient.delete(`/users/${id}/notify-online`);
  },

  changePassword(currentPassword: string, newPassword: string) {
    return apiClient.patch("/users/me/password", { currentPassword, newPassword });
  },

  setTwoFactor(currentPassword: string, twoFactorPassword: string, hint?: string) {
    return apiClient.put("/users/me/two-factor", { currentPassword, twoFactorPassword, hint });
  },

  disableTwoFactor(currentPassword: string) {
    return apiClient.delete("/users/me/two-factor", { data: { currentPassword } });
  },

  deleteAccount(currentPassword: string) {
    return apiClient.delete("/users/me", { data: { currentPassword } });
  },

  listLastSeenExceptions() {
    return apiClient.get<LastSeenException[]>("/users/me/last-seen-exceptions").then((r) => r.data);
  },

  setLastSeenException(userId: string, mode: "ALLOW" | "DENY") {
    return apiClient.put(`/users/me/last-seen-exceptions/${userId}`, { mode });
  },

  removeLastSeenException(userId: string) {
    return apiClient.delete(`/users/me/last-seen-exceptions/${userId}`);
  },
};
