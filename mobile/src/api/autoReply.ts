import { apiClient as api } from "./client";

export interface AutoReplySettings {
  id: string;
  userId: string;
  isEnabled: boolean;
  message: string;
  startAt: string | null;
  endAt: string | null;
  onlyForStrangers: boolean;
}

export const autoReplyApi = {
  get() {
    return api.get<AutoReplySettings | null>("/auto-reply").then((r) => r.data);
  },

  update(input: { isEnabled?: boolean; message?: string; startAt?: string; endAt?: string; onlyForStrangers?: boolean }) {
    return api.put<AutoReplySettings>("/auto-reply", input).then((r) => r.data);
  },
};
