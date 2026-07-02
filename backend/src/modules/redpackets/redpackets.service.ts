import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";

const userSelect = { id: true, username: true, displayName: true, avatarUrl: true };

export const redPacketsService = {
  async create(userId: string, data: { amount: number; currency?: string; message?: string }) {
    const amount = new Prisma.Decimal(data.amount);

    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { walletBalance: true } });
      if (!user) throw Errors.notFound("Foydalanuvchi");
      if (user.walletBalance.lt(amount)) throw Errors.badRequest("Hisobda yetarli mablag' yo'q");

      await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { decrement: amount } },
      });

      return tx.redPacket.create({
        data: {
          senderId: userId,
          amount,
          currency: data.currency ?? "UZS",
          message: data.message,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
        include: { sender: { select: userSelect } },
      });
    });
  },

  // Marks an expired packet EXPIRED and returns the money to the sender.
  // The ACTIVE-guarded updateMany makes the refund exactly-once even when
  // the claim path and the refund job race. Runs in its own transaction —
  // inside a throwing transaction the refund would be rolled back.
  async expireAndRefund(packetId: string) {
    await prisma.$transaction(async (tx) => {
      const packet = await tx.redPacket.findUnique({
        where: { id: packetId },
        select: { senderId: true, amount: true, status: true },
      });
      if (!packet || packet.status !== "ACTIVE") return;
      const marked = await tx.redPacket.updateMany({
        where: { id: packetId, status: "ACTIVE" },
        data: { status: "EXPIRED" },
      });
      if (marked.count === 0) return;
      await tx.user.update({
        where: { id: packet.senderId },
        data: { walletBalance: { increment: packet.amount } },
      });
    });
  },

  async claim(userId: string, packetId: string) {
    const existing = await prisma.redPacket.findUnique({ where: { id: packetId } });
    if (!existing) throw Errors.notFound("Qizil konvert");
    if (existing.status === "ACTIVE" && new Date() > existing.expiresAt) {
      await redPacketsService.expireAndRefund(packetId);
      throw Errors.badRequest("Konvert muddati tugagan");
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.redPacket.updateMany({
        where: {
          id: packetId,
          status: "ACTIVE",
          expiresAt: { gt: new Date() },
          senderId: { not: userId },
        },
        data: { status: "CLAIMED", claimedById: userId, claimedAt: new Date() },
      });

      if (updated.count === 0) {
        const packet = await tx.redPacket.findUnique({ where: { id: packetId } });
        if (!packet) throw Errors.notFound("Qizil konvert");
        if (packet.senderId === userId) throw Errors.badRequest("O'z konvertingizni ocholmaysiz");
        throw Errors.badRequest("Bu konvert allaqachon olingan yoki muddati tugagan");
      }

      const packet = await tx.redPacket.findUniqueOrThrow({
        where: { id: packetId },
        include: { sender: { select: userSelect }, claimedBy: { select: userSelect } },
      });

      await tx.user.update({
        where: { id: userId },
        data: { walletBalance: { increment: packet.amount } },
      });

      return packet;
    });
  },

  async getById(packetId: string) {
    const packet = await prisma.redPacket.findUnique({
      where: { id: packetId },
      include: { sender: { select: userSelect }, claimedBy: { select: userSelect } },
    });
    if (!packet) throw Errors.notFound("Qizil konvert");
    return packet;
  },

  async getMySent(userId: string) {
    return prisma.redPacket.findMany({
      where: { senderId: userId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { claimedBy: { select: userSelect } },
    });
  },

  async getMyClaimed(userId: string) {
    return prisma.redPacket.findMany({
      where: { claimedById: userId },
      orderBy: { claimedAt: "desc" },
      take: 100,
      include: { sender: { select: userSelect } },
    });
  },
};
