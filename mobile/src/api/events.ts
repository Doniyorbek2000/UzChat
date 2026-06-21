import { apiClient as api } from "./client";

export interface EventRsvp {
  id: string;
  eventId: string;
  userId: string;
  status: "going" | "maybe" | "not_going";
  respondedAt: string;
  user: { id: string; displayName: string; username: string; avatarUrl: string | null };
}

export interface ChatEvent {
  id: string;
  conversationId: string;
  creatorId: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string | null;
  isAllDay: boolean;
  color: string;
  reminderMinutes: number | null;
  createdAt: string;
  creator: { id: string; displayName: string; username: string; avatarUrl: string | null };
  rsvps: EventRsvp[];
  conversation?: { id: string; name: string | null };
}

export const eventsApi = {
  getUpcoming() {
    return api.get<ChatEvent[]>("/events/upcoming").then((r) => r.data);
  },

  listByConversation(conversationId: string) {
    return api.get<ChatEvent[]>(`/events/conversations/${conversationId}`).then((r) => r.data);
  },

  create(conversationId: string, input: { title: string; description?: string; location?: string; startAt: string; endAt?: string; isAllDay?: boolean; color?: string; reminderMinutes?: number }) {
    return api.post<ChatEvent>(`/events/conversations/${conversationId}`, input).then((r) => r.data);
  },

  update(eventId: string, input: { title?: string; description?: string; location?: string; startAt?: string; endAt?: string; isAllDay?: boolean; color?: string; reminderMinutes?: number | null }) {
    return api.patch<ChatEvent>(`/events/${eventId}`, input).then((r) => r.data);
  },

  delete(eventId: string) {
    return api.delete(`/events/${eventId}`);
  },

  rsvp(eventId: string, status: "going" | "maybe" | "not_going") {
    return api.post<EventRsvp>(`/events/${eventId}/rsvp`, { status }).then((r) => r.data);
  },

  getRsvps(eventId: string) {
    return api.get<EventRsvp[]>(`/events/${eventId}/rsvps`).then((r) => r.data);
  },
};
