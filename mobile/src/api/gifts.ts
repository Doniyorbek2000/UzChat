import { apiClient as api } from "./client";

export interface VirtualGiftData {
  id: string;
  name: string;
  icon: string;
  price: number;
  category: string;
}

export interface SentGiftData {
  id: string;
  giftId: string;
  gift: VirtualGiftData;
  senderId: string;
  receiverId: string;
  message: string | null;
  createdAt: string;
  sender?: { id: string; displayName: string; username: string; avatarUrl: string | null };
  receiver?: { id: string; displayName: string; username: string; avatarUrl: string | null };
}

export const giftsApi = {
  list(category?: string) { return api.get<VirtualGiftData[]>("/gifts", { params: { category } }).then((r) => r.data); },
  send(receiverId: string, giftId: string, message?: string) {
    return api.post<SentGiftData>("/gifts/send", { receiverId, giftId, message }).then((r) => r.data);
  },
  getReceived() { return api.get<SentGiftData[]>("/gifts/received").then((r) => r.data); },
  getSent() { return api.get<SentGiftData[]>("/gifts/sent").then((r) => r.data); },
};
