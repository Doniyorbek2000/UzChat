import { ConversationType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";

export const channelStatsService = {
  async getStats(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { where: { userId }, select: { role: true } } },
    });
    if (!conversation) throw Errors.notFound("Kanal");
    if (conversation.type !== ConversationType.CHANNEL) throw Errors.badRequest("Faqat kanallar uchun");
    if (conversation.participants.length === 0) throw Errors.forbidden();

    const [memberCount, totalMessages, last30Days] = await Promise.all([
      prisma.conversationParticipant.count({ where: { conversationId } }),
      prisma.message.count({ where: { conversationId } }),
      prisma.channelStats.findMany({
        where: { conversationId, date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        orderBy: { date: "asc" },
      }),
    ]);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const messagesThisWeek = await prisma.message.count({
      where: { conversationId, createdAt: { gte: weekAgo } },
    });

    return {
      memberCount,
      totalMessages,
      messagesThisWeek,
      dailyStats: last30Days,
    };
  },

  async recordDailyStats() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const channels = await prisma.conversation.findMany({
      where: { type: ConversationType.CHANNEL },
      select: { id: true },
    });

    for (const channel of channels) {
      const [memberCount, messageCount] = await Promise.all([
        prisma.conversationParticipant.count({ where: { conversationId: channel.id } }),
        prisma.message.count({
          where: { conversationId: channel.id, createdAt: { gte: yesterday, lt: today } },
        }),
      ]);

      await prisma.channelStats.upsert({
        where: { conversationId_date: { conversationId: channel.id, date: yesterday } },
        update: { memberCount, messageCount },
        create: { conversationId: channel.id, date: yesterday, memberCount, messageCount },
      });
    }
  },
};
