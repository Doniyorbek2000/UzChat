import { apiClient } from "./client";

export interface MiniAppCreator {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

export interface MiniApp {
  id: string;
  name: string;
  description: string | null;
  url: string;
  iconUrl: string | null;
  category: string;
  creator: MiniAppCreator;
  isActive: boolean;
  createdAt: string;
}

export const miniAppsApi = {
  list(category?: string) {
    return apiClient.get<MiniApp[]>("/mini-apps", { params: category ? { category } : {} }).then((r) => r.data);
  },

  getById(id: string) {
    return apiClient.get<MiniApp>(`/mini-apps/${id}`).then((r) => r.data);
  },

  create(input: { name: string; url: string; description?: string; iconUrl?: string; category?: string }) {
    return apiClient.post<MiniApp>("/mini-apps", input).then((r) => r.data);
  },

  update(id: string, input: { name?: string; url?: string; description?: string; iconUrl?: string; category?: string; isActive?: boolean }) {
    return apiClient.patch<MiniApp>(`/mini-apps/${id}`, input).then((r) => r.data);
  },

  remove(id: string) {
    return apiClient.delete(`/mini-apps/${id}`);
  },

  listMine() {
    return apiClient.get<MiniApp[]>("/mini-apps/mine").then((r) => r.data);
  },
};
