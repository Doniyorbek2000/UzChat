import { apiClient as api } from "./client";

export interface ChannelSubscription {
  id: string;
  conversationId: string;
  userId: string;
  tier: string;
  price: number;
  currency: string;
  isActive: boolean;
  startedAt: string;
  expiresAt: string | null;
  cancelledAt: string | null;
  user?: { id: string; displayName: string; username: string; avatarUrl: string | null };
  conversation?: { id: string; name: string | null; avatarUrl: string | null };
}

export interface SubscriptionStats {
  total: number;
  active: number;
  cancelled: number;
  monthlyRevenue: number;
}

export const subscriptionsApi = {
  getMySubscriptions() {
    return api.get<ChannelSubscription[]>("/subscriptions/mine").then((r) => r.data);
  },

  subscribe(conversationId: string, tier?: string) {
    return api.post<ChannelSubscription>(`/subscriptions/channels/${conversationId}`, { tier }).then((r) => r.data);
  },

  unsubscribe(conversationId: string) {
    return api.delete(`/subscriptions/channels/${conversationId}`);
  },

  getSubscribers(conversationId: string) {
    return api.get<ChannelSubscription[]>(`/subscriptions/channels/${conversationId}/subscribers`).then((r) => r.data);
  },

  getStats(conversationId: string) {
    return api.get<SubscriptionStats>(`/subscriptions/channels/${conversationId}/stats`).then((r) => r.data);
  },
};
