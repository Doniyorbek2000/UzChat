import { apiClient } from "./client";

export interface WalletBalance {
  balance: number;
  currency: string;
}

export interface PaymentUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

export interface Payment {
  id: string;
  sender: PaymentUser;
  receiver: PaymentUser;
  amount: number;
  currency: string;
  note: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export const paymentsApi = {
  getBalance() {
    return apiClient.get<WalletBalance>("/payments/balance").then((r) => r.data);
  },

  topUp(amount: number) {
    return apiClient.post<WalletBalance>("/payments/top-up", { amount }).then((r) => r.data);
  },

  send(receiverId: string, amount: number, note?: string) {
    return apiClient.post<Payment>("/payments/send", { receiverId, amount, note }).then((r) => r.data);
  },

  getHistory() {
    return apiClient.get<Payment[]>("/payments/history").then((r) => r.data);
  },
};
