import { apiClient as api } from "./client";

export interface VoiceRoomParticipant {
  id: string;
  userId: string;
  role: string;
  isMuted: boolean;
  joinedAt: string;
  user: { id: string; displayName: string; username: string; avatarUrl: string | null };
}

export interface VoiceRoom {
  id: string;
  title: string;
  hostId: string;
  conversationId: string | null;
  status: "SCHEDULED" | "LIVE" | "ENDED";
  scheduledFor: string | null;
  startedAt: string | null;
  endedAt: string | null;
  maxSpeakers: number;
  listenerCount: number;
  isRecording: boolean;
  participants: VoiceRoomParticipant[];
  host: { id: string; displayName: string; username: string; avatarUrl: string | null };
  createdAt: string;
}

export const voiceRoomsApi = {
  listLive() {
    return api.get<VoiceRoom[]>("/voice-rooms/live").then((r) => r.data);
  },

  listScheduled() {
    return api.get<VoiceRoom[]>("/voice-rooms/scheduled").then((r) => r.data);
  },

  create(input: { title: string; conversationId?: string; scheduledFor?: string; maxSpeakers?: number }) {
    return api.post<VoiceRoom>("/voice-rooms", input).then((r) => r.data);
  },

  get(roomId: string) {
    return api.get<VoiceRoom>(`/voice-rooms/${roomId}`).then((r) => r.data);
  },

  start(roomId: string) {
    return api.post<VoiceRoom>(`/voice-rooms/${roomId}/start`).then((r) => r.data);
  },

  end(roomId: string) {
    return api.post(`/voice-rooms/${roomId}/end`);
  },

  join(roomId: string) {
    return api.post(`/voice-rooms/${roomId}/join`);
  },

  leave(roomId: string) {
    return api.post(`/voice-rooms/${roomId}/leave`);
  },

  promoteToSpeaker(roomId: string, userId: string) {
    return api.post(`/voice-rooms/${roomId}/promote/${userId}`);
  },

  demoteToListener(roomId: string, userId: string) {
    return api.post(`/voice-rooms/${roomId}/demote/${userId}`);
  },

  toggleMute(roomId: string) {
    return api.post(`/voice-rooms/${roomId}/toggle-mute`);
  },
};
