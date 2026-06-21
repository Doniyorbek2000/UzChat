import { prisma } from "../../config/prisma";

const userSelect = { id: true, displayName: true, username: true, avatarUrl: true };

export const searchService = {
  async searchUsers(query: string, limit: number, offset: number) {
    return prisma.user.findMany({
      where: {
        OR: [
          { displayName: { contains: query, mode: "insensitive" } },
          { username: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { ...userSelect, bio: true, isVerified: true, verifiedType: true },
      take: limit,
      skip: offset,
      orderBy: { displayName: "asc" },
    });
  },

  async searchGroups(query: string, limit: number, offset: number) {
    return prisma.conversation.findMany({
      where: {
        type: "GROUP",
        title: { contains: query, mode: "insensitive" },
      },
      select: { id: true, title: true, avatarUrl: true, type: true, createdAt: true, _count: { select: { participants: true } } },
      take: limit,
      skip: offset,
    });
  },

  async searchChannels(query: string, limit: number, offset: number) {
    return prisma.conversation.findMany({
      where: {
        type: "CHANNEL",
        title: { contains: query, mode: "insensitive" },
      },
      select: { id: true, title: true, avatarUrl: true, type: true, createdAt: true, _count: { select: { participants: true } } },
      take: limit,
      skip: offset,
    });
  },

  async searchMessages(userId: string, query: string, conversationId: string | undefined, limit: number, offset: number) {
    const participantConvs = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    const allowedConvIds = participantConvs.map((p) => p.conversationId);

    const where: any = {
      conversationId: conversationId ? { in: allowedConvIds.includes(conversationId) ? [conversationId] : [] } : { in: allowedConvIds },
      ciphertext: { contains: query, mode: "insensitive" },
      deletedAt: null,
    };

    return prisma.message.findMany({
      where,
      select: {
        id: true, conversationId: true, type: true, ciphertext: true, nonce: true,
        createdAt: true, sender: { select: userSelect },
        conversation: { select: { id: true, title: true, type: true } },
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    });
  },

  async saveSearchHistory(userId: string, query: string, type: string) {
    await prisma.searchHistory.create({
      data: { userId, query, type },
    });
  },

  async getSearchHistory(userId: string) {
    return prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  },

  async clearSearchHistory(userId: string) {
    await prisma.searchHistory.deleteMany({ where: { userId } });
  },
};
