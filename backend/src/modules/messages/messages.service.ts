import { prisma } from "../../config/prisma";
import { chatsService } from "../chats/chats.service";
import { ListMessagesQuery, SendMessageInput } from "./messages.schema";

export const messagesService = {
  async sendMessage(userId: string, conversationId: string, input: SendMessageInput) {
    await chatsService.assertParticipant(userId, conversationId);

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          type: input.type,
          ciphertext: input.ciphertext,
          nonce: input.nonce,
          mediaUrl: input.mediaUrl,
        },
      });
      await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      return created;
    });

    return message;
  },

  async listMessages(userId: string, conversationId: string, query: ListMessagesQuery) {
    await chatsService.assertParticipant(userId, conversationId);

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(query.before ? { createdAt: { lt: new Date(query.before) } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: query.limit,
    });

    return messages.reverse();
  },

  async markRead(userId: string, conversationId: string) {
    await chatsService.assertParticipant(userId, conversationId);
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
  },
};
