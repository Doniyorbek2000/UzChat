import { apiClient } from "./client";
import { BroadcastList } from "../types";

export const broadcastsApi = {
  list() {
    return apiClient.get<BroadcastList[]>("/broadcast-lists").then((r) => r.data);
  },

  create(name: string, memberIds: string[]) {
    return apiClient.post<BroadcastList>("/broadcast-lists", { name, memberIds }).then((r) => r.data);
  },

  update(id: string, input: { name?: string; memberIds?: string[] }) {
    return apiClient.patch<BroadcastList>(`/broadcast-lists/${id}`, input).then((r) => r.data);
  },

  remove(id: string) {
    return apiClient.delete(`/broadcast-lists/${id}`);
  },
};
