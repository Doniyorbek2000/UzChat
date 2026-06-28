import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";

export const giftsService = {
  async listGifts(category?: string) {
    return prisma.virtualGift.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      orderBy: { price: "asc" },
      take: 200,
    });
  },

  async sendGift(senderId: string, receiverId: string, giftId: string, message?: string) {
    const gift = await prisma.virtualGift.findUnique({ where: { id: giftId } });
    if (!gift || !gift.isActive) throw Errors.notFound("Sovg'a topilmadi");

    return prisma.sentGift.create({
      data: { giftId, senderId, receiverId, message },
      include: {
        gift: true,
        sender: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
      },
    });
  },

  async getReceivedGifts(userId: string) {
    return prisma.sentGift.findMany({
      where: { receiverId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        gift: true,
        sender: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
      },
    });
  },

  async getSentGifts(userId: string) {
    return prisma.sentGift.findMany({
      where: { senderId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        gift: true,
        receiver: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
      },
    });
  },

  async createGift(data: { name: string; icon: string; price: number; category?: string }) {
    return prisma.virtualGift.create({ data });
  },
};
