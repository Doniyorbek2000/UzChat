import { apiClient as api } from "./client";

export interface DashboardStats {
  users: { total: number; newToday: number };
  conversations: { total: number };
  messages: { total: number; today: number };
  stores: { total: number };
  orders: { total: number };
  posts: { total: number };
}

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  phone: string;
  isAdmin: boolean;
  isVerified: boolean;
  verifiedType: string | null;
  createdAt: string;
  lastSeenAt: string | null;
  walletBalance?: number;
  bio?: string | null;
  _count?: {
    participants: number;
    messages: number;
    posts: number;
    stores: number;
    orders: number;
  };
}

export interface AdminReport {
  id: string;
  reporterId: string;
  reportedUserId: string;
  conversationId: string | null;
  messageId: string | null;
  reason: string;
  description: string | null;
  status: "PENDING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
  reporter: { id: string; username: string; displayName: string };
}

export interface SystemHealth {
  status: string;
  uptime: number;
  memory: { rss: number; heapTotal: number; heapUsed: number };
  dbLatencyMs: number;
  nodeVersion: string;
  timestamp: string;
}

export const adminApi = {
  async getDashboard(): Promise<DashboardStats> {
    const res = await api.get("/admin/dashboard");
    return res.data;
  },

  async getSystemHealth(): Promise<SystemHealth> {
    const res = await api.get("/admin/health");
    return res.data;
  },

  async listUsers(page = 1, search?: string): Promise<{ users: AdminUser[]; total: number; page: number; totalPages: number }> {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (search) params.set("search", search);
    const res = await api.get(`/admin/users?${params}`);
    return res.data;
  },

  async getUser(userId: string): Promise<AdminUser> {
    const res = await api.get(`/admin/users/${userId}`);
    return res.data;
  },

  async setUserAdmin(userId: string, isAdmin: boolean): Promise<AdminUser> {
    const res = await api.patch(`/admin/users/${userId}/admin`, { isAdmin });
    return res.data;
  },

  async setUserVerified(userId: string, isVerified: boolean, verifiedType?: string): Promise<AdminUser> {
    const res = await api.patch(`/admin/users/${userId}/verify`, { isVerified, verifiedType });
    return res.data;
  },

  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/admin/users/${userId}`);
  },

  async listReports(page = 1): Promise<{ reports: AdminReport[]; total: number; page: number; totalPages: number }> {
    const res = await api.get(`/admin/reports?page=${page}`);
    return res.data;
  },

  async resolveReport(reportId: string): Promise<AdminReport> {
    const res = await api.patch(`/admin/reports/${reportId}/resolve`);
    return res.data;
  },

  async dismissReport(reportId: string): Promise<AdminReport> {
    const res = await api.patch(`/admin/reports/${reportId}/dismiss`);
    return res.data;
  },
};
