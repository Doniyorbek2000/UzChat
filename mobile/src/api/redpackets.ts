import { apiClient as api } from "./client";

export interface RedPacketUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface RedPacket {
  id: string;
  senderId: string;
  amount: number;
  currency: string;
  message: string | null;
  status: "ACTIVE" | "CLAIMED" | "EXPIRED";
  claimedById: string | null;
  claimedAt: string | null;
  expiresAt: string;
  createdAt: string;
  sender?: RedPacketUser;
  claimedBy?: RedPacketUser | null;
}

export const redPacketsApi = {
  async create(data: { amount: number; currency?: string; message?: string }): Promise<RedPacket> {
    const res = await api.post("/red-packets", data);
    return res.data;
  },

  async claim(packetId: string): Promise<RedPacket> {
    const res = await api.post(`/red-packets/${packetId}/claim`);
    return res.data;
  },

  async getById(packetId: string): Promise<RedPacket> {
    const res = await api.get(`/red-packets/${packetId}`);
    return res.data;
  },

  async getMySent(): Promise<RedPacket[]> {
    const res = await api.get("/red-packets/history/sent");
    return res.data;
  },

  async getMyClaimed(): Promise<RedPacket[]> {
    const res = await api.get("/red-packets/history/claimed");
    return res.data;
  },
};
