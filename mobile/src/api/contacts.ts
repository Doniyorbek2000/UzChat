import { apiClient } from "./client";
import { BlockedUser, Contact, ContactRequest, ContactSuggestion, UpcomingBirthday, User } from "../types";

export const contactsApi = {
  list() {
    return apiClient.get<Contact[]>("/contacts").then((r) => r.data);
  },

  sendRequest(username: string) {
    return apiClient.post("/contacts", { username }).then((r) => r.data);
  },

  listIncomingRequests() {
    return apiClient.get<ContactRequest[]>("/contacts/requests").then((r) => r.data);
  },

  accept(requestId: string) {
    return apiClient.post(`/contacts/requests/${requestId}/accept`);
  },

  decline(requestId: string) {
    return apiClient.post(`/contacts/requests/${requestId}/decline`);
  },

  remove(contactId: string) {
    return apiClient.delete(`/contacts/${contactId}`);
  },

  updateAlias(contactId: string, alias: string | null) {
    return apiClient.patch<{ id: string; alias: string | null }>(`/contacts/${contactId}`, { alias }).then((r) => r.data);
  },

  setFavorite(contactId: string, isFavorite: boolean) {
    return apiClient
      .patch<{ id: string; isFavorite: boolean }>(`/contacts/${contactId}`, { isFavorite })
      .then((r) => r.data);
  },

  updateNote(contactId: string, note: string | null) {
    return apiClient.patch<{ id: string; note: string | null }>(`/contacts/${contactId}`, { note }).then((r) => r.data);
  },

  block(userId: string) {
    return apiClient.post(`/contacts/blocked/${userId}`);
  },

  unblock(userId: string) {
    return apiClient.delete(`/contacts/blocked/${userId}`);
  },

  listBlocked() {
    return apiClient.get<BlockedUser[]>("/contacts/blocked").then((r) => r.data);
  },

  listSuggestions() {
    return apiClient.get<ContactSuggestion[]>("/contacts/suggestions").then((r) => r.data);
  },

  dismissSuggestion(userId: string) {
    return apiClient.post(`/contacts/suggestions/${userId}/dismiss`);
  },

  listUpcomingBirthdays() {
    return apiClient.get<UpcomingBirthday[]>("/contacts/birthdays").then((r) => r.data);
  },

  listMutual(userId: string) {
    return apiClient.get<User[]>(`/contacts/mutual/${userId}`).then((r) => r.data);
  },
};
