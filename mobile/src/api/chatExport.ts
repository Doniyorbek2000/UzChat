import { apiClient as api } from "./client";

export interface ChatExportData {
  id: string;
  userId: string;
  conversationId: string;
  format: string;
  includeMedia: boolean;
  status: string;
  fileUrl: string | null;
  messageCount: number;
  createdAt: string;
  completedAt: string | null;
  conversation?: { id: string; title: string | null; type: string };
}

export const chatExportApi = {
  list() {
    return api.get<ChatExportData[]>("/chat-export").then((r) => r.data);
  },

  create(conversationId: string, format?: "txt" | "json" | "html", includeMedia?: boolean) {
    return api.post<ChatExportData>("/chat-export", { conversationId, format, includeMedia }).then((r) => r.data);
  },

  get(exportId: string) {
    return api.get<ChatExportData>(`/chat-export/${exportId}`).then((r) => r.data);
  },

  delete(exportId: string) {
    return api.delete(`/chat-export/${exportId}`);
  },
};
