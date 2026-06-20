import { CallStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";

const userSelect = {
  id: true,
  displayName: true,
  username: true,
  avatarUrl: true,
} as const;

export const callsService = {
  async createLog(callerId: string, receiverId: string, callType: string) {
    return prisma.callLog.create({
      data: { callerId, receiverId, callType },
      include: { caller: { select: userSelect }, receiver: { select: userSelect } },
    });
  },

  async updateStatus(id: string, status: CallStatus, duration?: number) {
    return prisma.callLog.update({
      where: { id },
      data: {
        status,
        duration: duration ?? 0,
        endedAt: new Date(),
      },
    });
  },

  async getHistory(userId: string) {
    return prisma.callLog.findMany({
      where: { OR: [{ callerId: userId }, { receiverId: userId }] },
      orderBy: { startedAt: "desc" },
      take: 100,
      include: {
        caller: { select: userSelect },
        receiver: { select: userSelect },
      },
    });
  },
};
