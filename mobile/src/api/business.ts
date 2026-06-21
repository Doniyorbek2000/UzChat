import { apiClient as api } from "./client";

export interface BusinessProfileData {
  id: string;
  userId: string;
  businessName: string;
  category: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  workingHours: string | null;
  coverUrl: string | null;
  isVerified: boolean;
  autoReplyMsg: string | null;
  greetingMsg: string | null;
  catalogEnabled: boolean;
  user?: { id: string; displayName: string; username: string; avatarUrl: string | null };
}

export const businessApi = {
  getMyProfile() { return api.get<BusinessProfileData | null>("/business/me").then((r) => r.data); },
  updateProfile(input: { businessName: string; category: string; description?: string; address?: string; phone?: string; email?: string; website?: string; workingHours?: string; coverUrl?: string; autoReplyMsg?: string; greetingMsg?: string; catalogEnabled?: boolean }) {
    return api.put<BusinessProfileData>("/business/me", input).then((r) => r.data);
  },
  deleteProfile() { return api.delete("/business/me"); },
  getPublicProfile(userId: string) { return api.get<BusinessProfileData>(`/business/user/${userId}`).then((r) => r.data); },
  search(q: string) { return api.get<BusinessProfileData[]>("/business/search", { params: { q } }).then((r) => r.data); },
  listByCategory(category: string) { return api.get<BusinessProfileData[]>(`/business/category/${category}`).then((r) => r.data); },
};
