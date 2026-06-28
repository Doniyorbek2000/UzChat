import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";

export const greetingsService = {
  async listCards(category?: string) {
    return prisma.greetingCard.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  },

  async sendCard(senderId: string, receiverId: string, cardId: string, message?: string) {
    const card = await prisma.greetingCard.findUnique({ where: { id: cardId } });
    if (!card || !card.isActive) throw Errors.notFound("Kartochka topilmadi");

    return prisma.sentGreetingCard.create({
      data: { cardId, senderId, receiverId, message },
      include: {
        card: true,
        sender: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
      },
    });
  },

  async getReceivedCards(userId: string) {
    return prisma.sentGreetingCard.findMany({
      where: { receiverId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        card: true,
        sender: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
      },
    });
  },

  async getSentCards(userId: string) {
    return prisma.sentGreetingCard.findMany({
      where: { senderId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        card: true,
        receiver: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
      },
    });
  },

  async getCategories() {
    const cards = await prisma.greetingCard.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ["category"],
      take: 50,
    });
    return cards.map((c) => c.category);
  },

  async createCard(data: { templateName: string; category: string; imageUrl: string }) {
    return prisma.greetingCard.create({ data });
  },
};
