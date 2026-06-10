import { apiClient } from "./client";
import { AuthUser, User } from "../types";

export const usersApi = {
  me() {
    return apiClient.get<AuthUser>("/users/me").then((r) => r.data);
  },

  updateMe(data: { displayName?: string; bio?: string; avatarUrl?: string }) {
    return apiClient.patch<AuthUser>("/users/me", data).then((r) => r.data);
  },

  search(query: string) {
    return apiClient.get<User[]>("/users/search", { params: { q: query } }).then((r) => r.data);
  },

  getById(id: string) {
    return apiClient.get<User>(`/users/${id}`).then((r) => r.data);
  },
};
