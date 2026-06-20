import { apiClient } from "./client";

export interface StoryItem {
  id: string;
  mediaUrl: string;
  caption: string | null;
  createdAt: string;
  expiresAt: string;
  viewed: boolean;
}

export interface StoryUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

export interface StoryGroup {
  user: StoryUser;
  stories: StoryItem[];
}

export interface StoryViewer {
  id: string;
  user: StoryUser;
  viewedAt: string;
}

export const storiesApi = {
  getFeed() {
    return apiClient.get<StoryGroup[]>("/stories/feed").then((r) => r.data);
  },

  create(mediaUrl: string, caption?: string) {
    return apiClient.post("/stories", { mediaUrl, caption }).then((r) => r.data);
  },

  viewStory(storyId: string) {
    return apiClient.post(`/stories/${storyId}/view`).then((r) => r.data);
  },

  getViewers(storyId: string) {
    return apiClient.get<StoryViewer[]>(`/stories/${storyId}/viewers`).then((r) => r.data);
  },

  deleteStory(storyId: string) {
    return apiClient.delete(`/stories/${storyId}`).then((r) => r.data);
  },
};
