import { ConversationType, Message, MessageType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { isUserOnline } from "../../sockets";
import { pushService } from "../push/push.service";
import { chatsService } from "../chats/chats.service";
import { contactsService } from "../contacts/contacts.service";
import { EditMessageInput, ListMessagesQuery, SendMessageInput } from "./messages.schema";

const RECALL_WINDOW_MS = 2 * 60 * 1000;

const replyToSelect = {
  select: {
    id: true,
    senderId: true,
    type: true,
    ciphertext: true,
    nonce: true,
    mediaUrl: true,
    deletedAt: true,
  },
} as const;

const reactionSelect = {
  select: { userId: true, emoji: true },
} as const;

const MEDIA_LABELS: Partial<Record<Message["type"], string>> = {
  IMAGE: "🖼 Rasm",
  VIDEO: "🎬 Video",
  AUDIO: "🎵 Ovozli xabar",
  FILE: "📄 Fayl",
};

function messageInclude(userId: string) {
  return {
    replyTo: replyToSelect,
    reactions: reactionSelect,
    stars: { where: { userId }, select: { id: true } },
  } as const;
}

function formatMessage<T extends { stars: { id: string }[] }>(message: T) {
  const { stars, ...rest } = message;
  return { ...rest, isStarred: stars.length > 0 };
}

async function resolveMentions(conversationId: string, userId: string, mentions: string[] | undefined) {
  if (!mentions?.length) return [];
  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  const participantIds = new Set(participants.map((p) => p.userId));
  return mentions.filter((id) => id !== userId && participantIds.has(id));
}

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
  const title = isGroup ? conversation.title ?? "Guruh" : sender.displayName;

  const mentionedIds = recipientIds.filter((id) => message.mentions.includes(id));
  const regularIds = recipientIds.filter((id) => !message.mentions.includes(id));

  if (mentionedIds.length > 0) {
    await pushService.sendToUsers(mentionedIds, {
      title,
      body: `${sender.displayName} sizni eslatib o'tdi`,
      data: { conversationId, messageId: message.id, type: "mention" },
    });
  }

  if (regularIds.length > 0) {
    await pushService.sendToUsers(regularIds, {
      title,
      body: isGroup ? `${sender.displayName}: ${contentLabel}` : contentLabel,
      data: { conversationId, messageId: message.id, type: "message" },
    });
  }
}

export const messagesService = {
  async sendMessage(userId: string, conversationId: string, input: SendMessageInput) {
    await chatsService.assertParticipant(userId, conversationId);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { select: { userId: true } } },
    });
    if (conversation?.type === ConversationType.DIRECT) {
      const other = conversation.participants.find((p) => p.userId !== userId);
      if (other && (await contactsService.isBlockedEitherWay(userId, other.userId))) {
        throw Errors.blocked();
      }
    }

    if (input.replyToId) {
      const replyTo = await prisma.message.findUnique({ where: { id: input.replyToId } });
      if (!replyTo || replyTo.conversationId !== conversationId) {
        throw Errors.badRequest("Javob beriladigan xabar topilmadi");
      }
    }

    const mentions = await resolveMentions(conversationId, userId, input.mentions);

    const expiresAt = conversation?.disappearingSeconds
      ? new Date(Date.now() + conversation.disappearingSeconds * 1000)
      : null;

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          conversationId,
          senderId: userId,
          type: input.type,
          ciphertext: input.ciphertext,
          nonce: input.nonce,
          mediaUrl: input.mediaUrl,
          replyToId: input.replyToId,
          mentions,
          expiresAt,
        },
        include: messageInclude(userId),
      });
      await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      return created;
    });

    notifyParticipants(userId, conversationId, message).catch(() => {});

    return formatMessage(message);
  },

  async listMessages(userId: string, conversationId: string, query: ListMessagesQuery) {
    const participant = await chatsService.assertParticipant(userId, conversationId);

    const createdAtFilter: { lt?: Date; gt?: Date } = {};
    if (query.before) createdAtFilter.lt = new Date(query.before);
    if (participant.clearedAt) createdAtFilter.gt = participant.clearedAt;

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(Object.keys(createdAtFilter).length ? { createdAt: createdAtFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: query.limit,
      include: messageInclude(userId),
    });

    return messages.reverse().map(formatMessage);
  },

  async listMedia(userId: string, conversationId: string, query: ListMessagesQuery) {
    const participant = await chatsService.assertParticipant(userId, conversationId);

    const createdAtFilter: { lt?: Date; gt?: Date } = {};
    if (query.before) createdAtFilter.lt = new Date(query.before);
    if (participant.clearedAt) createdAtFilter.gt = participant.clearedAt;

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        type: { in: [MessageType.IMAGE, MessageType.VIDEO, MessageType.AUDIO, MessageType.FILE] },
        deletedAt: null,
        ...(Object.keys(createdAtFilter).length ? { createdAt: createdAtFilter } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: query.limit,
      include: messageInclude(userId),
    });

    return messages.map(formatMessage);
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

  async editMessage(userId: string, conversationId: string, messageId: string, input: EditMessageInput) {
    await chatsService.assertParticipant(userId, conversationId);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId) throw Errors.notFound("Xabar");
    if (message.senderId !== userId) throw Errors.forbidden();
    if (message.deletedAt) throw Errors.badRequest("O'chirilgan xabarni tahrirlab bo'lmaydi");
    if (Date.now() - message.createdAt.getTime() > RECALL_WINDOW_MS) {
      throw Errors.badRequest("Xabarni faqat yuborilgandan keyin 2 daqiqa ichida tahrirlash mumkin");
    }

    const mentions = await resolveMentions(conversationId, userId, input.mentions);

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { ciphertext: input.ciphertext, nonce: input.nonce, mentions, editedAt: new Date() },
      include: messageInclude(userId),
    });

    return formatMessage(updated);
  },

  async markRead(userId: string, conversationId: string) {
    await chatsService.assertParticipant(userId, conversationId);
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date(), markedUnread: false },
    });
  },

  async setReaction(userId: string, conversationId: string, messageId: string, emoji: string) {
    await chatsService.assertParticipant(userId, conversationId);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId) throw Errors.notFound("Xabar");
    if (message.deletedAt) throw Errors.badRequest("O'chirilgan xabarga reaksiya qo'yib bo'lmaydi");

    const existing = await prisma.messageReaction.findUnique({
      where: { messageId_userId: { messageId, userId } },
    });

    if (existing && existing.emoji === emoji) {
      await prisma.messageReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.messageReaction.upsert({
        where: { messageId_userId: { messageId, userId } },
        create: { messageId, userId, emoji },
        update: { emoji },
      });
    }

    return prisma.messageReaction.findMany({ where: { messageId }, ...reactionSelect });
  },

  async toggleStar(userId: string, conversationId: string, messageId: string) {
    await chatsService.assertParticipant(userId, conversationId);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId) throw Errors.notFound("Xabar");
    if (message.deletedAt) throw Errors.badRequest("O'chirilgan xabarni saqlab bo'lmaydi");

    const existing = await prisma.messageStar.findUnique({
      where: { messageId_userId: { messageId, userId } },
    });

    if (existing) {
      await prisma.messageStar.delete({ where: { id: existing.id } });
      return { starred: false };
    }

    await prisma.messageStar.create({ data: { messageId, userId } });
    return { starred: true };
  },

  async listStarred(userId: string) {
    const stars = await prisma.messageStar.findMany({
      where: { userId, message: { deletedAt: null } },
      orderBy: { createdAt: "desc" },
      include: { message: { include: { replyTo: replyToSelect, reactions: reactionSelect } } },
    });

    return stars.map((s) => ({ ...s.message, isStarred: true }));
  },

  // Soft-deletes messages whose disappearing-messages timer has elapsed.
  async expireDueMessages() {
    const due = await prisma.message.findMany({
      where: { expiresAt: { lte: new Date() }, deletedAt: null },
      select: { id: true, conversationId: true },
    });
    if (due.length === 0) return [];

    return Promise.all(
      due.map((m) =>
        prisma.message.update({
          where: { id: m.id },
          data: { ciphertext: "", nonce: "", mediaUrl: null, deletedAt: new Date(), expiresAt: null },
        })
      )
    );
  },
};
