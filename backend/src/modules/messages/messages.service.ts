import fs from "fs/promises";
import path from "path";
import { ConversationType, GroupAuditAction, Message, MessageType, ParticipantRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { getIo, isUserOnline } from "../../sockets";
import { pushService } from "../push/push.service";
import { chatsService, isParticipantMuted } from "../chats/chats.service";
import { contactsService } from "../contacts/contacts.service";
import { uploadsDir } from "../media/upload";
import { EditMessageInput, ListMessagesQuery, SendMessageInput, SetReminderInput } from "./messages.schema";

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

// Hides other participants' identities from an anonymous poll's votes, keeping
// only the viewer's own vote (if any) and the raw counts/optionIds intact.
// Pass viewerId null to anonymize every vote, including the viewer's own.
function anonymizePollVotes<V extends { userId: string; optionIds: string[] }>(
  votes: V[],
  viewerId: string | null
): (Omit<V, "userId"> & { userId: string | null })[] {
  return votes.map((v) => (v.userId === viewerId ? v : { ...v, userId: null }));
}

function formatMessage<
  T extends {
    stars: { id: string }[];
    hiddenFor?: string[];
    type: MessageType;
    pollAnonymous?: boolean;
    pollVotes?: { userId: string; optionIds: string[] }[];
  }
>(message: T, viewerId: string) {
  const { stars, hiddenFor, ...rest } = message;
  const pollVotes =
    rest.type === MessageType.POLL && rest.pollAnonymous && rest.pollVotes
      ? anonymizePollVotes(rest.pollVotes, viewerId)
      : rest.pollVotes;
  return { ...rest, pollVotes, isStarred: stars.length > 0 };
}

async function resolveMentions(conversationId: string, userId: string, mentions: string[] | undefined) {
  if (!mentions?.length) return [];
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { type: true, participants: { select: { userId: true, role: true } } },
  });
  if (!conversation) return [];

  const participantIds = new Set(conversation.participants.map((p) => p.userId));
  const resolved = mentions.filter((id) => id !== userId && participantIds.has(id));

  // Mentioning every other participant at once ("@hammasi") is reserved for the
  // owner/admins so regular members can't mass-notify the whole group.
  const senderRole = conversation.participants.find((p) => p.userId === userId)?.role;
  const mentionsEveryone = conversation.participants.length > 2 && resolved.length >= conversation.participants.length - 1;
  if (conversation.type === ConversationType.GROUP && senderRole === "MEMBER" && mentionsEveryone) {
    throw Errors.forbidden("Faqat guruh egasi va adminlar hammani eslatishi mumkin");
  }

  return resolved;
}

// Shown instead of the sender's name and message preview for recipients who
// enabled "hide notification content" - reveals only that something happened.
const HIDDEN_TITLE = "UzChat";
const HIDDEN_BODY = "Yangi xabar";

// A per-conversation notificationPreview override ("SHOW"/"HIDE") takes
// precedence over the user's global hideNotificationContent setting.
function shouldHidePreview(
  notificationPreview: "DEFAULT" | "SHOW" | "HIDE",
  globalHideNotificationContent: boolean
): boolean {
  if (notificationPreview === "HIDE") return true;
  if (notificationPreview === "SHOW") return false;
  return globalHideNotificationContent;
}

// Whether `user` currently has "do not disturb" active, based on their
// configured local-time window and captured UTC offset.
function isInQuietHours(user: {
  quietHoursEnabled: boolean;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  quietHoursTimezoneOffset: number | null;
}): boolean {
  if (!user.quietHoursEnabled || user.quietHoursStart == null || user.quietHoursEnd == null) return false;
  const offset = user.quietHoursTimezoneOffset ?? 0;
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const localMinutes = (((utcMinutes + offset) % 1440) + 1440) % 1440;
  const { quietHoursStart: start, quietHoursEnd: end } = user;
  if (start === end) return true;
  if (start < end) return localMinutes >= start && localMinutes < end;
  return localMinutes >= start || localMinutes < end;
}

// Whether `user` has globally paused notifications ("do not disturb"),
// either indefinitely (notificationsPaused) or until a future time
// (notificationsPausedUntil) - mirrors isParticipantMuted for conversations.
function isNotificationsPaused(user: { notificationsPaused: boolean; notificationsPausedUntil: Date | null }): boolean {
  return user.notificationsPaused || (user.notificationsPausedUntil !== null && user.notificationsPausedUntil.getTime() > Date.now());
}

async function notifyParticipants(senderId: string, conversationId: string, message: Message, silent: boolean) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              notifyPrivateChats: true,
              notifyGroupChats: true,
              notifyMentions: true,
              hideNotificationContent: true,
              quietHoursEnabled: true,
              quietHoursStart: true,
              quietHoursEnd: true,
              quietHoursTimezoneOffset: true,
              notificationsPaused: true,
              notificationsPausedUntil: true,
            },
          },
        },
      },
    },
  });
  if (!conversation) return;

  const sender = conversation.participants.find((p) => p.userId === senderId)?.user;
  if (!sender) return;

  const recipients = conversation.participants.filter(
    (p) =>
      p.userId !== senderId &&
      !p.mutedSenderIds.includes(senderId) &&
      !isUserOnline(p.userId) &&
      !isInQuietHours(p.user) &&
      !isNotificationsPaused(p.user)
  );
  if (recipients.length === 0) return;

  const contentLabel = MEDIA_LABELS[message.type] ?? "Yangi xabar";
  const isGroup = conversation.type === "GROUP";
  const title = isGroup ? conversation.title ?? "Guruh" : sender.displayName;

  let repliedToSenderId: string | null = null;
  if (message.replyToId) {
    const repliedTo = await prisma.message.findUnique({ where: { id: message.replyToId }, select: { senderId: true } });
    repliedToSenderId = repliedTo?.senderId ?? null;
  }

  // Muted conversations are silenced, except for messages that @-mention the recipient
  // (unless that recipient turned off notifyMentions, in which case they're treated
  // like a regular message).
  const mentioned = recipients.filter((p) => message.mentions.includes(p.userId) && p.user.notifyMentions);
  const replied = recipients.filter(
    (p) => p.userId === repliedToSenderId && !mentioned.includes(p) && !isParticipantMuted(p)
  );
  const regular = recipients.filter(
    (p) =>
      !mentioned.includes(p) &&
      p.userId !== repliedToSenderId &&
      !isParticipantMuted(p) &&
      (isGroup ? p.user.notifyGroupChats : p.user.notifyPrivateChats)
  );

  const send = async (participants: typeof recipients, body: string, type: string) => {
    const visible = participants
      .filter((p) => !shouldHidePreview(p.notificationPreview, p.user.hideNotificationContent))
      .map((p) => p.userId);
    const hidden = participants
      .filter((p) => shouldHidePreview(p.notificationPreview, p.user.hideNotificationContent))
      .map((p) => p.userId);
    const data = { conversationId, messageId: message.id, type };
    if (visible.length > 0) {
      await pushService.sendToUsers(visible, { title, body, data, silent });
    }
    if (hidden.length > 0) {
      await pushService.sendToUsers(hidden, { title: HIDDEN_TITLE, body: HIDDEN_BODY, data, silent });
    }
  };

  if (mentioned.length > 0) {
    await send(mentioned, `${sender.displayName} sizni eslatib o'tdi`, "mention");
  }

  if (replied.length > 0) {
    await send(replied, `${sender.displayName} sizning xabaringizga javob berdi`, "reply");
  }

  if (regular.length > 0) {
    await send(regular, isGroup ? `${sender.displayName}: ${contentLabel}` : contentLabel, "message");
  }
}

async function markDeliveredForOnlineRecipients(
  conversationId: string,
  senderId: string,
  participants: { userId: string }[],
  deliveredAt: Date
) {
  const onlineRecipients = participants.filter((p) => p.userId !== senderId && isUserOnline(p.userId));
  if (onlineRecipients.length === 0) return;

  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId: { in: onlineRecipients.map((p) => p.userId) } },
    data: { lastDeliveredAt: deliveredAt },
  });

  for (const p of onlineRecipients) {
    getIo().to(`conversation:${conversationId}`).emit("message:delivered", {
      conversationId,
      userId: p.userId,
      at: deliveredAt.toISOString(),
    });
  }
}

async function notifyReaction(reactorId: string, conversationId: string, message: Message, emoji: string) {
  if (isUserOnline(message.senderId) || message.senderId === reactorId) return;

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: message.senderId } },
  });
  if (!participant || isParticipantMuted(participant) || participant.mutedSenderIds.includes(reactorId)) return;

  const [reactor, recipient] = await Promise.all([
    prisma.user.findUnique({ where: { id: reactorId }, select: { displayName: true } }),
    prisma.user.findUnique({
      where: { id: message.senderId },
      select: {
        notifyReactions: true,
        hideNotificationContent: true,
        quietHoursEnabled: true,
        quietHoursStart: true,
        quietHoursEnd: true,
        quietHoursTimezoneOffset: true,
        notificationsPaused: true,
        notificationsPausedUntil: true,
      },
    }),
  ]);
  if (!reactor || !recipient?.notifyReactions) return;
  if (isInQuietHours(recipient) || isNotificationsPaused(recipient)) return;

  if (shouldHidePreview(participant.notificationPreview, recipient.hideNotificationContent)) {
    await pushService.sendToUsers([message.senderId], {
      title: HIDDEN_TITLE,
      body: HIDDEN_BODY,
      data: { conversationId, messageId: message.id, type: "reaction" },
    });
    return;
  }

  await pushService.sendToUsers([message.senderId], {
    title: reactor.displayName,
    body: `${emoji} bilan reaksiya bildirdi`,
    data: { conversationId, messageId: message.id, type: "reaction" },
  });
}

// Delivers a scheduled message now: makes it visible to other participants,
// computes a fresh disappearing-messages timer based on the conversation's
// current setting, and notifies recipients.
async function publishScheduledMessage(m: Message) {
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

  notifyParticipants(m.senderId, m.conversationId, updated, false).catch(() => {});
  return formatMessage(updated, m.senderId);
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
      !conversation.membersCanSendMedia &&
      participant.role === "MEMBER" &&
      input.type !== MessageType.TEXT
    ) {
      throw Errors.forbidden("Bu guruhda a'zolar faqat matnli xabar yuborishi mumkin");
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

    const pollClosesAt = input.pollClosesInSeconds
      ? new Date(Date.now() + input.pollClosesInSeconds * 1000)
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
          forwardedFromUserId: input.forwardedFromUserId,
          forwardCount: input.forwardCount ?? 0,
          expiresAt,
          scheduledFor: isScheduled ? new Date(input.scheduledFor!) : null,
          viewOnce: input.viewOnce ?? false,
          isSpoiler: input.isSpoiler ?? false,
          pollAnonymous: input.pollAnonymous ?? false,
          pollClosesAt,
        },
        include: messageInclude(userId),
      });
      if (!isScheduled) {
        await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      }
      return created;
    });

    if (!isScheduled) {
      notifyParticipants(userId, conversationId, message, input.silent ?? false).catch(() => {});
      markDeliveredForOnlineRecipients(conversationId, userId, conversation?.participants ?? [], message.createdAt).catch(() => {});
    }

    return formatMessage(message, userId);
  },

  async listMessages(userId: string, conversationId: string, query: ListMessagesQuery) {
    const participant = await chatsService.assertParticipant(userId, conversationId);

    const createdAtFilter: { lt?: Date; gt?: Date } = {};
    if (query.before) createdAtFilter.lt = new Date(query.before);

    const gtCandidates: Date[] = [];
    if (participant.clearedAt) gtCandidates.push(participant.clearedAt);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { type: true, hideHistoryForNewMembers: true },
    });
    if (conversation?.type === ConversationType.GROUP && conversation.hideHistoryForNewMembers) {
      gtCandidates.push(participant.joinedAt);
    }
    if (gtCandidates.length > 0) {
      createdAtFilter.gt = gtCandidates.reduce((a, b) => (a > b ? a : b));
    }

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

    return messages.reverse().map((m) => formatMessage(m, userId));
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

    return messages.map((m) => formatMessage(m, userId));
  },

  async getStats(userId: string, conversationId: string) {
    const participant = await chatsService.assertParticipant(userId, conversationId);

    const baseWhere = {
      conversationId,
      scheduledFor: null,
      deletedAt: null,
      NOT: { hiddenFor: { has: userId } },
      ...(participant.clearedAt ? { createdAt: { gt: participant.clearedAt } } : {}),
    };

    const counts = await prisma.message.groupBy({
      by: ["type"],
      where: baseWhere,
      _count: { _all: true },
    });

    const byType = new Map(counts.map((c) => [c.type, c._count._all]));
    const total = counts.filter((c) => c.type !== MessageType.SYSTEM).reduce((sum, c) => sum + c._count._all, 0);

    const stats: {
      total: number;
      media: number;
      voice: number;
      files: number;
      topSenders?: { userId: string; count: number }[];
      byWeekday?: number[];
      topReactedMessages?: { message: ReturnType<typeof formatMessage>; reactionCount: number }[];
    } = {
      total,
      media: (byType.get(MessageType.IMAGE) ?? 0) + (byType.get(MessageType.VIDEO) ?? 0),
      voice: byType.get(MessageType.AUDIO) ?? 0,
      files: byType.get(MessageType.FILE) ?? 0,
    };

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { type: true },
    });

    // Group-only breakdown: most active members, weekday activity histogram, and
    // most-reacted messages, based on the most recent 1000 non-system messages.
    if (conversation?.type === ConversationType.GROUP) {
      const senderCounts = await prisma.message.groupBy({
        by: ["senderId"],
        where: { ...baseWhere, type: { not: MessageType.SYSTEM } },
        _count: { _all: true },
        orderBy: { _count: { senderId: "desc" } },
        take: 5,
      });
      stats.topSenders = senderCounts.map((s) => ({ userId: s.senderId, count: s._count._all }));

      const recentMessages = await prisma.message.findMany({
        where: { ...baseWhere, type: { not: MessageType.SYSTEM } },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });
      const byWeekday = new Array(7).fill(0);
      for (const m of recentMessages) byWeekday[m.createdAt.getDay()]++;
      stats.byWeekday = byWeekday;

      const reactionCounts = await prisma.messageReaction.groupBy({
        by: ["messageId"],
        where: { message: { ...baseWhere, type: { not: MessageType.SYSTEM } } },
        _count: { _all: true },
        orderBy: { _count: { messageId: "desc" } },
        take: 5,
      });
      if (reactionCounts.length > 0) {
        const reactedMessages = await prisma.message.findMany({
          where: { id: { in: reactionCounts.map((r) => r.messageId) } },
          include: messageInclude(userId),
        });
        const messageById = new Map(reactedMessages.map((m) => [m.id, m]));
        stats.topReactedMessages = reactionCounts.flatMap((r) => {
          const message = messageById.get(r.messageId);
          return message ? [{ message: formatMessage(message, userId), reactionCount: r._count._all }] : [];
        });
      }
    }

    return stats;
  },

  // Account-wide activity summary for the current user, across all their conversations.
  async getMyActivityStats(userId: string) {
    const [user, participations, sentCounts] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
      prisma.conversationParticipant.findMany({ where: { userId }, select: { conversationId: true } }),
      prisma.message.groupBy({
        by: ["type"],
        where: { senderId: userId, deletedAt: null, scheduledFor: null, type: { not: MessageType.SYSTEM } },
        _count: { _all: true },
      }),
    ]);

    const conversationIds = participations.map((p) => p.conversationId);
    const byType = new Map(sentCounts.map((c) => [c.type, c._count._all]));
    const totalSent = sentCounts.reduce((sum, c) => sum + c._count._all, 0);

    const totalReceived = await prisma.message.count({
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        deletedAt: null,
        scheduledFor: null,
        type: { not: MessageType.SYSTEM },
        NOT: { hiddenFor: { has: userId } },
      },
    });

    const topConversationCounts = await prisma.message.groupBy({
      by: ["conversationId"],
      where: { senderId: userId, deletedAt: null, scheduledFor: null, type: { not: MessageType.SYSTEM } },
      _count: { _all: true },
      orderBy: { _count: { conversationId: "desc" } },
      take: 5,
    });

    // Weekday activity histogram, based on this user's most recent 1000 sent messages.
    const recentMessages = await prisma.message.findMany({
      where: { senderId: userId, deletedAt: null, scheduledFor: null, type: { not: MessageType.SYSTEM } },
      select: { createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });
    const byWeekday = new Array(7).fill(0);
    for (const m of recentMessages) byWeekday[m.createdAt.getDay()]++;

    return {
      totalSent,
      totalReceived,
      media: (byType.get(MessageType.IMAGE) ?? 0) + (byType.get(MessageType.VIDEO) ?? 0),
      voice: byType.get(MessageType.AUDIO) ?? 0,
      files: byType.get(MessageType.FILE) ?? 0,
      conversationCount: conversationIds.length,
      memberSince: user!.createdAt,
      byWeekday,
      topConversations: topConversationCounts.map((c) => ({ conversationId: c.conversationId, count: c._count._all })),
    };
  },

  async deleteMessage(userId: string, conversationId: string, messageId: string) {
    const participant = await chatsService.assertParticipant(userId, conversationId);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId) throw Errors.notFound("Xabar");
    if (message.deletedAt) return message;

    const isOwnMessage = message.senderId === userId;
    const isGroupManager = participant.role === ParticipantRole.OWNER || participant.role === ParticipantRole.ADMIN;
    if (!isOwnMessage && !isGroupManager) throw Errors.forbidden();

    if (isOwnMessage && Date.now() - message.createdAt.getTime() > RECALL_WINDOW_MS) {
      throw Errors.badRequest("Xabarni faqat yuborilgandan keyin 2 daqiqa ichida o'chirish mumkin");
    }

    if (!isOwnMessage && isGroupManager) {
      await chatsService.logGroupAction(
        conversationId,
        userId,
        GroupAuditAction.MESSAGE_DELETED,
        message.senderId,
        message.type
      );
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

    if (message.viewedAt) {
      return formatMessage({ ...message, reactions: [], pollVotes: [], replyTo: null, stars: [] }, userId);
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { viewedAt: new Date(), mediaUrl: null },
      include: messageInclude(userId),
    });

    if (message.mediaUrl) {
      const filename = path.basename(message.mediaUrl);
      await fs.unlink(path.join(uploadsDir, filename)).catch(() => {});
    }

    return formatMessage(updated, userId);
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

    await prisma.messageEditHistory.create({
      data: {
        messageId,
        ciphertext: message.ciphertext,
        nonce: message.nonce,
        editedAt: message.editedAt ?? message.createdAt,
      },
    });

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { ciphertext: input.ciphertext, nonce: input.nonce, mentions, editedAt: new Date() },
      include: messageInclude(userId),
    });

    return formatMessage(updated, userId);
  },

  async getEditHistory(userId: string, conversationId: string, messageId: string) {
    await chatsService.assertParticipant(userId, conversationId);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId) throw Errors.notFound("Xabar");

    const history = await prisma.messageEditHistory.findMany({
      where: { messageId },
      orderBy: { editedAt: "asc" },
    });

    return history.map((h) => ({ ciphertext: h.ciphertext, nonce: h.nonce, editedAt: h.editedAt }));
  },

  async markRead(userId: string, conversationId: string, upToMessageId?: string) {
    await chatsService.assertParticipant(userId, conversationId);

    let lastReadAt = new Date();
    if (upToMessageId) {
      const message = await prisma.message.findUnique({ where: { id: upToMessageId } });
      if (!message || message.conversationId !== conversationId) throw Errors.notFound("Xabar");

      const target = message.createdAt < lastReadAt ? message.createdAt : lastReadAt;
      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
        select: { lastReadAt: true },
      });
      // Never move the read marker backward - "mark as read up to here" only advances it.
      lastReadAt = participant?.lastReadAt && participant.lastReadAt >= target ? participant.lastReadAt : target;
    }

    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt, markedUnread: false },
    });
  },

  async markDelivered(userId: string, conversationId: string) {
    await chatsService.assertParticipant(userId, conversationId);
    await prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastDeliveredAt: new Date() },
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
      notifyReaction(userId, conversationId, message, emoji).catch(() => {});
    }

    return prisma.messageReaction.findMany({ where: { messageId }, ...reactionSelect });
  },

  async votePoll(userId: string, conversationId: string, messageId: string, optionIds: string[]) {
    await chatsService.assertParticipant(userId, conversationId);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId) throw Errors.notFound("Xabar");
    if (message.type !== MessageType.POLL) throw Errors.badRequest("Bu xabar so'rovnoma emas");
    if (message.deletedAt) throw Errors.badRequest("O'chirilgan so'rovnomaga ovoz berib bo'lmaydi");
    if (message.pollClosedAt) throw Errors.badRequest("So'rovnoma yopilgan, ovoz berib bo'lmaydi");

    if (optionIds.length === 0) {
      await prisma.pollVote.deleteMany({ where: { messageId, userId } });
    } else {
      await prisma.pollVote.upsert({
        where: { messageId_userId: { messageId, userId } },
        create: { messageId, userId, optionIds },
        update: { optionIds },
      });
    }

    const votes = await prisma.pollVote.findMany({ where: { messageId }, ...pollVoteSelect });
    if (!message.pollAnonymous) {
      return { responseVotes: votes, broadcastVotes: votes };
    }
    return {
      responseVotes: anonymizePollVotes(votes, userId),
      broadcastVotes: anonymizePollVotes(votes, null),
    };
  },

  async closePoll(userId: string, conversationId: string, messageId: string) {
    await chatsService.assertParticipant(userId, conversationId);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId) throw Errors.notFound("Xabar");
    if (message.type !== MessageType.POLL) throw Errors.badRequest("Bu xabar so'rovnoma emas");
    if (message.senderId !== userId) throw Errors.forbidden("Faqat so'rovnoma muallifi uni yopa oladi");
    if (message.pollClosedAt) throw Errors.badRequest("So'rovnoma allaqachon yopilgan");

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { pollClosedAt: new Date() },
    });
    return updated.pollClosedAt!;
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
      const pollVotes =
        rest.type === MessageType.POLL && rest.pollAnonymous ? anonymizePollVotes(rest.pollVotes, userId) : rest.pollVotes;
      return { ...rest, pollVotes, isStarred: true };
    });
  },

  async setReminder(userId: string, conversationId: string, messageId: string, input: SetReminderInput) {
    await chatsService.assertParticipant(userId, conversationId);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId) throw Errors.notFound("Xabar");
    if (message.deletedAt) throw Errors.badRequest("O'chirilgan xabar uchun eslatma qo'yib bo'lmaydi");

    const remindAt = new Date(Date.now() + input.remindInSeconds * 1000);
    await prisma.messageReminder.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId, remindAt },
      update: { remindAt },
    });
    return { remindAt };
  },

  async cancelReminder(userId: string, conversationId: string, messageId: string) {
    await chatsService.assertParticipant(userId, conversationId);
    await prisma.messageReminder.deleteMany({ where: { messageId, userId } });
  },

  // All pending reminders for a user, soonest first.
  async listReminders(userId: string) {
    const reminders = await prisma.messageReminder.findMany({
      where: { userId, message: { deletedAt: null, NOT: { hiddenFor: { has: userId } } } },
      orderBy: { remindAt: "asc" },
      include: { message: { include: messageInclude(userId) } },
    });

    return reminders.map((r) => ({
      message: formatMessage(r.message, userId),
      remindAt: r.remindAt,
      conversationId: r.message.conversationId,
    }));
  },

  // Pops all reminders whose time has come, for the background job to notify.
  async sendDueReminders() {
    const due = await prisma.messageReminder.findMany({
      where: { remindAt: { lte: new Date() } },
      select: { id: true, userId: true, messageId: true, message: { select: { conversationId: true } } },
    });
    if (due.length === 0) return [];

    await prisma.messageReminder.deleteMany({ where: { id: { in: due.map((r) => r.id) } } });
    return due.map((r) => ({ userId: r.userId, messageId: r.messageId, conversationId: r.message.conversationId }));
  },

  // All messages across the user's conversations that @-mention them, most recent first.
  async listMentions(userId: string) {
    const participations = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true, clearedAt: true },
    });
    if (participations.length === 0) return [];

    const clearedAtMap = new Map(participations.map((p) => [p.conversationId, p.clearedAt]));

    const messages = await prisma.message.findMany({
      where: {
        conversationId: { in: participations.map((p) => p.conversationId) },
        mentions: { has: userId },
        deletedAt: null,
        NOT: { hiddenFor: { has: userId } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: messageInclude(userId),
    });

    return messages
      .filter((m) => {
        const clearedAt = clearedAtMap.get(m.conversationId);
        return !clearedAt || m.createdAt > clearedAt;
      })
      .map((m) => formatMessage(m, userId));
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

  // Auto-closes polls whose voting deadline has passed.
  async closeDuePolls() {
    const due = await prisma.message.findMany({
      where: { pollClosesAt: { lte: new Date() }, pollClosedAt: null },
      select: { id: true, conversationId: true },
    });
    if (due.length === 0) return [];

    const closedAt = new Date();
    return Promise.all(
      due.map((m) =>
        prisma.message.update({
          where: { id: m.id },
          data: { pollClosedAt: closedAt, pollClosesAt: null },
          select: { id: true, conversationId: true, pollClosedAt: true },
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

    return messages.map((m) => formatMessage(m, userId));
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

  async rescheduleMessage(userId: string, conversationId: string, messageId: string, scheduledFor: string) {
    await chatsService.assertParticipant(userId, conversationId);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId || message.scheduledFor === null) {
      throw Errors.notFound("Rejalashtirilgan xabar");
    }
    if (message.senderId !== userId) throw Errors.forbidden();

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: { scheduledFor: new Date(scheduledFor) },
      include: messageInclude(userId),
    });
    return formatMessage(updated, userId);
  },

  async sendScheduledNow(userId: string, conversationId: string, messageId: string) {
    await chatsService.assertParticipant(userId, conversationId);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId || message.scheduledFor === null) {
      throw Errors.notFound("Rejalashtirilgan xabar");
    }
    if (message.senderId !== userId) throw Errors.forbidden();

    return publishScheduledMessage(message);
  },

  // Publishes (delivers) scheduled messages whose time has come.
  async publishDueScheduledMessages() {
    const due = await prisma.message.findMany({
      where: { scheduledFor: { lte: new Date() } },
    });
    if (due.length === 0) return [];

    const published = [];
    for (const m of due) {
      published.push(await publishScheduledMessage(m));
    }
    return published;
  },
};
