import { apiClient as api } from "./client";

export interface CommunityGroup {
  id: string;
  communityId: string;
  conversationId: string;
  role: string;
  addedAt: string;
  conversation?: { id: string; name: string | null };
}

export interface Community {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  ownerId: string;
  announcementGroupId: string | null;
  memberCount: number;
  groups: CommunityGroup[];
  createdAt: string;
}

export const communitiesApi = {
  listMine() {
    return api.get<Community[]>("/communities/mine").then((r) => r.data);
  },

  get(communityId: string) {
    return api.get<Community>(`/communities/${communityId}`).then((r) => r.data);
  },

  create(input: { name: string; description?: string; avatarUrl?: string }) {
    return api.post<Community>("/communities", input).then((r) => r.data);
  },

  update(communityId: string, input: { name?: string; description?: string; avatarUrl?: string }) {
    return api.patch<Community>(`/communities/${communityId}`, input).then((r) => r.data);
  },

  delete(communityId: string) {
    return api.delete(`/communities/${communityId}`);
  },

  addGroup(communityId: string, conversationId: string) {
    return api.post<CommunityGroup>(`/communities/${communityId}/groups`, { conversationId }).then((r) => r.data);
  },

  removeGroup(communityId: string, conversationId: string) {
    return api.delete(`/communities/${communityId}/groups/${conversationId}`);
  },
};
