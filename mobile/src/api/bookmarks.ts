import { apiClient as api } from "./client";

export interface Bookmark {
  id: string;
  userId: string;
  messageId: string;
  label: string | null;
  createdAt: string;
  message: {
    id: string;
    conversationId: string;
    type: string;
    ciphertext: string;
    nonce: string;
    createdAt: string;
    sender: { id: string; displayName: string; username: string; avatarUrl: string | null };
    conversation: { id: string; title: string | null; type: string };
  };
}

export const bookmarksApi = {
  list() {
    return api.get<Bookmark[]>("/bookmarks").then((r) => r.data);
  },

  add(messageId: string, label?: string) {
    return api.post<Bookmark>("/bookmarks", { messageId, label }).then((r) => r.data);
  },

  remove(bookmarkId: string) {
    return api.delete(`/bookmarks/${bookmarkId}`);
  },

  removeByMessage(messageId: string) {
    return api.delete(`/bookmarks/message/${messageId}`);
  },
};
