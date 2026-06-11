import fs from "fs/promises";
import path from "path";
import { ConversationType, Message, MessageType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { isUserOnline } from "../../sockets";
import { pushService } from "../push/push.service";
import { chatsService } from "../chats/chats.service";
import { contactsService } from "../contacts/contacts.service";
import { uploadsDir } from "../media/upload";
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

const pollVoteSelect = {
  select: { userId: true, optionIds: true },
} as const;

const MEDIA_LABELS: Partial<Record<Message["type"], string>> = {
  IMAGE: "🖼 Rasm",
  VIDEO: "🎬 Video",
  AUDIO: "🎵 Ovozli xabar",
  FILE: "📄 Fayl",
  CONTACT: "👤 Kontakt",
  POLL: "📊 So'rovnoma",
};

function messageInclude(userId: string) {
  return {
    replyTo: replyToSelect,
    reactions: reactionSelect,
    pollVotes: pollVoteSelect,
    stars: { where: { userId }, select: { id: true } },
  } as const;
}

function formatMessage<T extends { stars: { id: string }[]; hiddenFor?: string[] }>(message: T) {
  const { stars, hiddenFor, ...rest } = message;
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
    const participant = await chatsService.assertParticipant(userId, conversationId);

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

    if (
      conversation?.type === ConversationType.GROUP &&
      conversation.onlyAdminsCanSend &&
      participant.role === "MEMBER"
    ) {
      throw Errors.forbidden("Faqat guruh egasi va adminlar xabar yubora oladi");
    }

    if (
      conversation?.type === ConversationType.GROUP &&
      participant.role === "MEMBER" &&
      participant.restrictedUntil !== null &&
      participant.restrictedUntil.getTime() > Date.now()
    ) {
      throw Errors.forbidden("Siz vaqtincha xabar yubora olmaysiz: admin sizni cheklagan");
    }

    const isScheduled = !!input.scheduledFor;

    if (
      !isScheduled &&
      conversation?.type === ConversationType.GROUP &&
      conversation.slowModeSeconds > 0 &&
      participant.role === "MEMBER"
    ) {
      const lastMessage = await prisma.message.findFirst({
        where: { conversationId, senderId: userId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      if (lastMessage) {
        const elapsedMs = Date.now() - lastMessage.createdAt.getTime();
        const remainingMs = conversation.slowModeSeconds * 1000 - elapsedMs;
        if (remainingMs > 0) {
          const remainingSeconds = Math.ceil(remainingMs / 1000);
          throw Errors.badRequest(`Sekin rejim: yana ${remainingSeconds} soniyadan keyin xabar yuborishingiz mumkin`);
        }
      }
    }

    if (input.replyToId) {
      const replyTo = await prisma.message.findUnique({ where: { id: input.replyToId } });
      if (!replyTo || replyTo.conversationId !== conversationId) {
        throw Errors.badRequest("Javob beriladigan xabar topilmadi");
      }
    }

    const mentions = await resolveMentions(conversationId, userId, input.mentions);

    const expiresAt =
      !isScheduled && conversation?.disappearingSeconds
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
          forwardedFromName: input.forwardedFromName,
          expiresAt,
          scheduledFor: isScheduled ? new Date(input.scheduledFor!) : null,
          viewOnce: input.viewOnce ?? false,
        },
        include: messageInclude(userId),
      });
      if (!isScheduled) {
        await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      }
      return created;
    });

    if (!isScheduled) {
      notifyParticipants(userId, conversationId, message).catch(() => {});
    }

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
        scheduledFor: null,
        NOT: { hiddenFor: { has: userId } },
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
        viewOnce: false,
        deletedAt: null,
        scheduledFor: null,
        NOT: { hiddenFor: { has: userId } },
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

  async hideMessageForMe(userId: string, conversationId: string, messageId: string) {
    await chatsService.assertParticipant(userId, conversationId);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId) throw Errors.notFound("Xabar");
    if (message.hiddenFor.includes(userId)) return;

    await prisma.message.update({
      where: { id: messageId },
      data: { hiddenFor: { push: userId } },
    });
  },

  // Marks a "view once" IMAGE message as viewed and deletes its media file
  // server-side, so it can never be downloaded again. Idempotent.
  async viewMessage(userId: string, conversationId: string, messageId: string) {
    await chatsService.assertParticipant(userId, conversationId);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId) throw Errors.notFound("Xabar");
    if (message.type !== MessageType.IMAGE || !message.viewOnce) {
      throw Errors.badRequest("Bu xabar bir martalik emas");
    }

    if (message.senderId === userId) {
      const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
      if (!conversation?.isSelf) throw Errors.forbidden();
    }

    if (message.viewedAt) return formatMessage({ ...message, reactions: [], pollVotes: [], replyTo: null, stars: [] });

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { viewedAt: new Date(), mediaUrl: null },
      include: messageInclude(userId),
    });

    if (message.mediaUrl) {
      const filename = path.basename(message.mediaUrl);
      await fs.unlink(path.join(uploadsDir, filename)).catch(() => {});
    }

    return formatMessage(updated);
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

  async votePoll(userId: string, conversationId: string, messageId: string, optionIds: string[]) {
    await chatsService.assertParticipant(userId, conversationId);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId) throw Errors.notFound("Xabar");
    if (message.type !== MessageType.POLL) throw Errors.badRequest("Bu xabar so'rovnoma emas");
    if (message.deletedAt) throw Errors.badRequest("O'chirilgan so'rovnomaga ovoz berib bo'lmaydi");

    if (optionIds.length === 0) {
      await prisma.pollVote.deleteMany({ where: { messageId, userId } });
    } else {
      await prisma.pollVote.upsert({
        where: { messageId_userId: { messageId, userId } },
        create: { messageId, userId, optionIds },
        update: { optionIds },
      });
    }

    return prisma.pollVote.findMany({ where: { messageId }, ...pollVoteSelect });
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
      where: { userId, message: { deletedAt: null, NOT: { hiddenFor: { has: userId } } } },
      orderBy: { createdAt: "desc" },
      include: { message: { include: { replyTo: replyToSelect, reactions: reactionSelect, pollVotes: pollVoteSelect } } },
    });

    return stars.map((s) => {
      const { hiddenFor, ...rest } = s.message;
      return { ...rest, isStarred: true };
    });
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

  async listScheduledMessages(userId: string, conversationId: string) {
    await chatsService.assertParticipant(userId, conversationId);

    const messages = await prisma.message.findMany({
      where: { conversationId, senderId: userId, scheduledFor: { not: null } },
      orderBy: { scheduledFor: "asc" },
      include: messageInclude(userId),
    });

    return messages.map(formatMessage);
  },

  async cancelScheduledMessage(userId: string, conversationId: string, messageId: string) {
    await chatsService.assertParticipant(userId, conversationId);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId || message.scheduledFor === null) {
      throw Errors.notFound("Rejalashtirilgan xabar");
    }
    if (message.senderId !== userId) throw Errors.forbidden();

    await prisma.message.delete({ where: { id: messageId } });
  },

  // Publishes (delivers) scheduled messages whose time has come: makes them
  // visible to other participants, computes a fresh disappearing-messages
  // timer based on the conversation's current setting, and notifies recipients.
  async publishDueScheduledMessages() {
    const due = await prisma.message.findMany({
      where: { scheduledFor: { lte: new Date() } },
    });
    if (due.length === 0) return [];

    const published = [];
    for (const m of due) {
      const conversation = await prisma.conversation.findUnique({ where: { id: m.conversationId } });
      const expiresAt = conversation?.disappearingSeconds
        ? new Date(Date.now() + conversation.disappearingSeconds * 1000)
        : null;

      const updated = await prisma.message.update({
        where: { id: m.id },
        data: { scheduledFor: null, createdAt: new Date(), expiresAt },
        include: messageInclude(m.senderId),
      });
      await prisma.conversation.update({ where: { id: m.conversationId }, data: { updatedAt: new Date() } });

      notifyParticipants(m.senderId, m.conversationId, updated).catch(() => {});
      published.push(formatMessage(updated));
    }
    return published;
  },
};
