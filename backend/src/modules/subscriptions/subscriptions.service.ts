import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";

const userSelect = { id: true, displayName: true, username: true, avatarUrl: true };

export const subscriptionsService = {
  async subscribe(userId: string, conversationId: string, tier: string) {
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation) throw Errors.notFound("Kanal topilmadi");
    if (conversation.type !== "CHANNEL") throw Errors.badRequest("Faqat kanallarga obuna bo'lish mumkin");

    const existing = await prisma.channelSubscription.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (existing?.isActive) throw Errors.conflict("Siz allaqachon obunachisiz");

    if (existing) {
      return prisma.channelSubscription.update({
        where: { id: existing.id },
        data: { isActive: true, tier, cancelledAt: null, startedAt: new Date() },
        include: { user: { select: userSelect } },
      });
    }

    return prisma.channelSubscription.create({
      data: { conversationId, userId, tier },
      include: { user: { select: userSelect } },
    });
  },

  async unsubscribe(userId: string, conversationId: string) {
    const sub = await prisma.channelSubscription.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!sub || !sub.isActive) throw Errors.notFound("Obuna topilmadi");

    return prisma.channelSubscription.update({
      where: { id: sub.id },
      data: { isActive: false, cancelledAt: new Date() },
    });
  },

  async getChannelSubscribers(conversationId: string) {
    return prisma.channelSubscription.findMany({
      where: { conversationId, isActive: true },
      include: { user: { select: userSelect } },
      orderBy: { startedAt: "desc" },
    });
  },

  async getMySubscriptions(userId: string) {
    return prisma.channelSubscription.findMany({
      where: { userId, isActive: true },
      include: { conversation: { select: { id: true, title: true, avatarUrl: true } } },
      orderBy: { startedAt: "desc" },
    });
  },

  async getSubscriptionStats(conversationId: string) {
    const [total, active] = await Promise.all([
      prisma.channelSubscription.count({ where: { conversationId } }),
      prisma.channelSubscription.count({ where: { conversationId, isActive: true } }),
    ]);

    const revenue = await prisma.channelSubscription.aggregate({
      where: { conversationId, isActive: true },
      _sum: { price: true },
    });

    return {
      total,
      active,
      cancelled: total - active,
      monthlyRevenue: revenue._sum.price ?? new Prisma.Decimal(0),
    };
  },
};
