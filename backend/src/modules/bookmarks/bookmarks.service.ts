import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";

const userSelect = { id: true, displayName: true, username: true, avatarUrl: true };

export const bookmarksService = {
  async list(userId: string) {
    return prisma.bookmark.findMany({
      where: { userId },
      include: {
        message: {
          select: {
            id: true, conversationId: true, type: true, ciphertext: true, nonce: true, createdAt: true,
            sender: { select: userSelect },
            conversation: { select: { id: true, title: true, type: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  },

  async add(userId: string, messageId: string, label?: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: { include: { participants: true } } },
    });
    if (!message) throw Errors.notFound("Xabar topilmadi");

    const isParticipant = message.conversation.participants.some((p) => p.userId === userId);
    if (!isParticipant) throw Errors.forbidden("Siz bu suhbat a'zosi emassiz");

    return prisma.bookmark.upsert({
      where: { userId_messageId: { userId, messageId } },
      create: { userId, messageId, label },
      update: { label },
    });
  },

  async remove(userId: string, bookmarkId: string) {
    const bookmark = await prisma.bookmark.findUnique({ where: { id: bookmarkId } });
    if (!bookmark || bookmark.userId !== userId) throw Errors.notFound("Xatcho'p topilmadi");
    await prisma.bookmark.delete({ where: { id: bookmarkId } });
  },

  async removeByMessage(userId: string, messageId: string) {
    await prisma.bookmark.deleteMany({ where: { userId, messageId } });
  },
};
