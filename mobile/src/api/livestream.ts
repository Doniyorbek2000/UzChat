import { apiClient as api } from "./client";

export interface LiveStream {
  id: string;
  hostId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  streamUrl: string | null;
  status: "SCHEDULED" | "LIVE" | "ENDED";
  scheduledFor: string | null;
  startedAt: string | null;
  endedAt: string | null;
  viewerCount: number;
  peakViewers: number;
  likeCount: number;
  replayUrl: string | null;
  host: { id: string; displayName: string; username: string; avatarUrl: string | null };
  createdAt: string;
}

export const liveStreamApi = {
  listActive() {
    return api.get<LiveStream[]>("/live/active").then((r) => r.data);
  },

  listScheduled() {
    return api.get<LiveStream[]>("/live/scheduled").then((r) => r.data);
  },

  create(input: { title: string; description?: string; thumbnailUrl?: string; scheduledFor?: string }) {
    return api.post<LiveStream>("/live", input).then((r) => r.data);
  },

  get(streamId: string) {
    return api.get<LiveStream>(`/live/${streamId}`).then((r) => r.data);
  },

  start(streamId: string) {
    return api.post<LiveStream>(`/live/${streamId}/start`).then((r) => r.data);
  },

  end(streamId: string) {
    return api.post(`/live/${streamId}/end`);
  },

  recordView(streamId: string) {
    return api.post(`/live/${streamId}/view`);
  },

  like(streamId: string) {
    return api.put(`/live/${streamId}/like`);
  },
};
