import { apiClient } from "./client";
import { Contact, ContactRequest } from "../types";

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
};
