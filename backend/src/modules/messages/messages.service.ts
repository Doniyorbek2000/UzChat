import { Message } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { isUserOnline } from "../../sockets";
import { pushService } from "../push/push.service";
import { chatsService } from "../chats/chats.service";
import { ListMessagesQuery, SendMessageInput } from "./messages.schema";

const RECALL_WINDOW_MS = 2 * 60 * 1000;

const MEDIA_LABELS: Partial<Record<Message["type"], string>> = {
  IMAGE: "🖼 Rasm",
  VIDEO: "🎬 Video",
  AUDIO: "🎵 Ovozli xabar",
  FILE: "📄 Fayl",
};

async function notifyParticipants(senderId: string, conversationId: string, message: Message) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { participants: { include: { user: { select: { id: true, displayName: true } } } } },
  });
  if (!conversation) return;

  const sender = conversation.participants.find((p) => p.userId === senderId)?.user;
  if (!sender) return;

  const recipientIds = conversation.participants
    .map((p) => p.userId)
    .filter((id) => id !== senderId && !isUserOnline(id));
  if (recipientIds.length === 0) return;

  const contentLabel = MEDIA_LABELS[message.type] ?? "Yangi xabar";
  const isGroup = conversation.type === "GROUP";

  await pushService.sendToUsers(recipientIds, {
    title: isGroup ? conversation.title ?? "Guruh" : sender.displayName,
    body: isGroup ? `${sender.displayName}: ${contentLabel}` : contentLabel,
    data: { conversationId, messageId: message.id, type: "message" },
  });
}

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

    notifyParticipants(userId, conversationId, message).catch(() => {});

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

  async deleteMessage(userId: string, conversationId: string, messageId: string) {
    await chatsService.assertParticipant(userId, conversationId);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId) throw Errors.notFound("Xabar");
    if (message.senderId !== userId) throw Errors.forbidden();
    if (message.deletedAt) return message;
    if (Date.now() - message.createdAt.getTime() > RECALL_WINDOW_MS) {
      throw Errors.badRequest("Xabarni faqat yuborilgandan keyin 2 daqiqa ichida o'chirish mumkin");
    }

    return prisma.message.update({
      where: { id: messageId },
      data: { ciphertext: "", nonce: "", mediaUrl: null, deletedAt: new Date() },
    });
  },

  async markRead(userId: string, conversationId: string) {
    await chatsService.assertParticipant(userId, conversationId);
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
  },
};
