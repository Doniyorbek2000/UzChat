import { apiClient as api } from "./client";

export const preferencesApi = {
  getAll() { return api.get<Record<string, string>>("/preferences").then((r) => r.data); },
  get(key: string) { return api.get<{ key: string; value: string | null }>(`/preferences/${key}`).then((r) => r.data); },
  set(key: string, value: string) { return api.put(`/preferences/${key}`, { value }).then((r) => r.data); },
  setMany(prefs: Record<string, string>) { return api.put("/preferences", prefs).then((r) => r.data); },
  remove(key: string) { return api.delete(`/preferences/${key}`).then((r) => r.data); },
};
