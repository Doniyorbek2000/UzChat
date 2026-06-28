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

  async claim(userId: string, packetId: string) {
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
        if (packet.status !== "ACTIVE") throw Errors.badRequest("Bu konvert allaqachon olingan yoki muddati tugagan");
        if (new Date() > packet.expiresAt) {
          await tx.redPacket.update({ where: { id: packetId }, data: { status: "EXPIRED" } });
          throw Errors.badRequest("Konvert muddati tugagan");
        }
        throw Errors.badRequest("Konvertni olishda xatolik");
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
