import { apiClient as api } from "./client";

export interface BotCommand {
  id: string;
  botId: string;
  command: string;
  description: string;
}

export interface Bot {
  id: string;
  ownerId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  description: string | null;
  token?: string;
  webhookUrl: string | null;
  isInline: boolean;
  isActive: boolean;
  commands: BotCommand[];
  owner?: { id: string; username: string; displayName: string };
  createdAt: string;
}

export const botsApi = {
  search(query?: string) {
    return api.get<Bot[]>("/bots/search", { params: { q: query } }).then((r) => r.data);
  },

  listMine() {
    return api.get<Bot[]>("/bots/mine").then((r) => r.data);
  },

  create(input: { username: string; displayName: string; description?: string; avatarUrl?: string }) {
    return api.post<Bot>("/bots", input).then((r) => r.data);
  },

  get(botId: string) {
    return api.get<Bot>(`/bots/${botId}`).then((r) => r.data);
  },

  getByUsername(username: string) {
    return api.get<Bot>(`/bots/username/${username}`).then((r) => r.data);
  },

  update(botId: string, input: { displayName?: string; description?: string; avatarUrl?: string; webhookUrl?: string; isInline?: boolean }) {
    return api.patch<Bot>(`/bots/${botId}`, input).then((r) => r.data);
  },

  regenerateToken(botId: string) {
    return api.post<{ id: string; token: string }>(`/bots/${botId}/regenerate-token`).then((r) => r.data);
  },

  toggleActive(botId: string) {
    return api.post<Bot>(`/bots/${botId}/toggle-active`).then((r) => r.data);
  },

  addCommand(botId: string, input: { command: string; description: string }) {
    return api.post<BotCommand>(`/bots/${botId}/commands`, input).then((r) => r.data);
  },

  removeCommand(botId: string, commandId: string) {
    return api.delete(`/bots/${botId}/commands/${commandId}`);
  },

  delete(botId: string) {
    return api.delete(`/bots/${botId}`);
  },
};
