import { apiClient as api } from "./client";

export interface QrPayment {
  id: string;
  creatorId: string;
  amount: number | null;
  currency: string;
  note: string | null;
  qrCode: string;
  status: "PENDING" | "COMPLETED" | "EXPIRED" | "CANCELLED";
  payerId: string | null;
  paidAt: string | null;
  expiresAt: string;
  createdAt: string;
  creator: { id: string; displayName: string; username: string; avatarUrl: string | null };
  payer: { id: string; displayName: string; username: string; avatarUrl: string | null } | null;
}

export const qrPaymentsApi = {
  create(input: { amount?: number; currency?: string; note?: string }) {
    return api.post<QrPayment>("/payments/qr", input).then((r) => r.data);
  },

  getByCode(qrCode: string) {
    return api.get<QrPayment>(`/payments/qr/${qrCode}`).then((r) => r.data);
  },

  pay(input: { qrCode: string; amount?: number }) {
    return api.post<QrPayment>("/payments/qr/pay", input).then((r) => r.data);
  },

  cancel(qrPaymentId: string) {
    return api.delete(`/payments/qr/${qrPaymentId}`);
  },

  listMine() {
    return api.get<QrPayment[]>("/payments/qr/mine").then((r) => r.data);
  },
};
