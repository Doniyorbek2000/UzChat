import { apiClient } from "./client";
import { ChatFolder } from "../types";

export const chatFoldersApi = {
  list() {
    return apiClient.get<ChatFolder[]>("/chat-folders").then((r) => r.data);
  },

  create(name: string) {
    return apiClient.post<ChatFolder>("/chat-folders", { name }).then((r) => r.data);
  },

  update(
    id: string,
    input: {
      name?: string;
      order?: number;
      conversationIds?: string[];
      includeUnread?: boolean;
      includeGroups?: boolean;
      includeDirect?: boolean;
      excludeMuted?: boolean;
    }
  ) {
    return apiClient.patch<ChatFolder>(`/chat-folders/${id}`, input).then((r) => r.data);
  },

  remove(id: string) {
    return apiClient.delete(`/chat-folders/${id}`);
  },
};
