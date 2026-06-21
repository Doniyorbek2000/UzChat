import { apiClient as api } from "./client";

export interface SharedTheme {
  id: string;
  creatorId: string;
  name: string;
  description: string | null;
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  accentColor: string | null;
  isDark: boolean;
  wallpaperUrl: string | null;
  installCount: number;
  isPublic: boolean;
  creator?: { id: string; displayName: string; username: string };
  createdAt: string;
}

export const themesApi = {
  listPopular() {
    return api.get<SharedTheme[]>("/themes/popular").then((r) => r.data);
  },

  listMine() {
    return api.get<SharedTheme[]>("/themes/mine").then((r) => r.data);
  },

  search(query: string) {
    return api.get<SharedTheme[]>("/themes/search", { params: { q: query } }).then((r) => r.data);
  },

  get(themeId: string) {
    return api.get<SharedTheme>(`/themes/${themeId}`).then((r) => r.data);
  },

  create(input: {
    name: string;
    description?: string;
    primaryColor: string;
    backgroundColor: string;
    surfaceColor: string;
    textColor: string;
    accentColor?: string;
    isDark?: boolean;
    wallpaperUrl?: string;
  }) {
    return api.post<SharedTheme>("/themes", input).then((r) => r.data);
  },

  update(themeId: string, input: Partial<SharedTheme>) {
    return api.patch<SharedTheme>(`/themes/${themeId}`, input).then((r) => r.data);
  },

  delete(themeId: string) {
    return api.delete(`/themes/${themeId}`);
  },

  install(themeId: string) {
    return api.post(`/themes/${themeId}/install`);
  },
};
