import { apiClient } from "./client";

export interface CallUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

export interface CallLog {
  id: string;
  caller: CallUser;
  receiver: CallUser;
  callType: string;
  status: "MISSED" | "ANSWERED" | "REJECTED" | "BUSY";
  duration: number;
  startedAt: string;
  endedAt: string | null;
}

export const callsApi = {
  getHistory() {
    return apiClient.get<CallLog[]>("/calls/history").then((r) => r.data);
  },
};
