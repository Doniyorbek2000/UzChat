import { apiClient as api } from "./client";

export interface NotifLogEntry {
  id: string;
  type: string;
  title: string;
  body: string;
  data: string | null;
  isRead: boolean;
  createdAt: string;
}

export const notifLogApi = {
  getAll(cursor?: string) {
    return api.get<{ notifications: NotifLogEntry[]; nextCursor: string | null }>("/notification-log", { params: { cursor } }).then((r) => r.data);
  },
  getUnreadCount() { return api.get<{ count: number }>("/notification-log/unread-count").then((r) => r.data); },
  markAsRead(id: string) { return api.patch(`/notification-log/${id}/read`).then((r) => r.data); },
  markAllAsRead() { return api.patch("/notification-log/read-all").then((r) => r.data); },
  clearAll() { return api.delete("/notification-log/clear").then((r) => r.data); },
};
