import { apiClient as api } from "./client";

export interface GreetingCardData {
  id: string;
  templateName: string;
  category: string;
  imageUrl: string;
}

export interface SentCardData {
  id: string;
  cardId: string;
  card: GreetingCardData;
  senderId: string;
  receiverId: string;
  message: string | null;
  createdAt: string;
  sender?: { id: string; displayName: string; username: string; avatarUrl: string | null };
  receiver?: { id: string; displayName: string; username: string; avatarUrl: string | null };
}

export const greetingsApi = {
  listCards(category?: string) { return api.get<GreetingCardData[]>("/greetings", { params: { category } }).then((r) => r.data); },
  getCategories() { return api.get<string[]>("/greetings/categories").then((r) => r.data); },
  send(receiverId: string, cardId: string, message?: string) {
    return api.post<SentCardData>("/greetings/send", { receiverId, cardId, message }).then((r) => r.data);
  },
  getReceived() { return api.get<SentCardData[]>("/greetings/received").then((r) => r.data); },
  getSent() { return api.get<SentCardData[]>("/greetings/sent").then((r) => r.data); },
};
