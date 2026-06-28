import { prisma } from "../../config/prisma";

export const draftsService = {
  async list(userId: string) {
    return prisma.draft.findMany({
      where: { userId },
      include: { conversation: { select: { id: true, title: true, type: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  },

  async upsert(userId: string, conversationId: string, content: string, replyToId?: string, attachments?: string[]) {
    return prisma.draft.upsert({
      where: { userId_conversationId: { userId, conversationId } },
      create: { userId, conversationId, content, replyToId, attachments: attachments ?? [] },
      update: { content, replyToId, attachments: attachments ?? [] },
    });
  },

  async delete(userId: string, conversationId: string) {
    await prisma.draft.deleteMany({ where: { userId, conversationId } });
  },
};
