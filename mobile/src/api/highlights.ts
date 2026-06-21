import { apiClient as api } from "./client";

export interface StoryHighlight {
  id: string;
  userId: string;
  title: string;
  coverUrl: string | null;
  order: number;
  items: StoryHighlightItem[];
}

export interface StoryHighlightItem {
  id: string;
  highlightId: string;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  caption: string | null;
  order: number;
}

export const highlightsApi = {
  listByUser(userId: string) {
    return api.get<StoryHighlight[]>(`/highlights/user/${userId}`).then((r) => r.data);
  },

  get(highlightId: string) {
    return api.get<StoryHighlight>(`/highlights/${highlightId}`).then((r) => r.data);
  },

  create(input: { title: string; coverUrl?: string }) {
    return api.post<StoryHighlight>("/highlights", input).then((r) => r.data);
  },

  update(highlightId: string, input: { title?: string; coverUrl?: string }) {
    return api.patch<StoryHighlight>(`/highlights/${highlightId}`, input).then((r) => r.data);
  },

  delete(highlightId: string) {
    return api.delete(`/highlights/${highlightId}`);
  },

  addItem(highlightId: string, input: { mediaUrl: string; mediaType?: "IMAGE" | "VIDEO"; caption?: string }) {
    return api.post<StoryHighlightItem>(`/highlights/${highlightId}/items`, input).then((r) => r.data);
  },

  removeItem(itemId: string) {
    return api.delete(`/highlights/items/${itemId}`);
  },
};
