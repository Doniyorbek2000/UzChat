import { apiClient as api } from "./client";

export interface Draft {
  id: string;
  userId: string;
  conversationId: string;
  content: string;
  replyToId: string | null;
  attachments: string[];
  updatedAt: string;
  conversation: { id: string; title: string | null; type: string };
}

export const draftsApi = {
  list() {
    return api.get<Draft[]>("/drafts").then((r) => r.data);
  },

  save(conversationId: string, content: string, replyToId?: string, attachments?: string[]) {
    return api.put<Draft>(`/drafts/${conversationId}`, { content, replyToId, attachments }).then((r) => r.data);
  },

  delete(conversationId: string) {
    return api.delete(`/drafts/${conversationId}`);
  },
};
