import crypto from "crypto";
import { ConversationType, GroupAddPrivacy, GroupAuditAction, MessagePrivacy, ParticipantRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { getContactIds, getLastSeenExceptions, filterLastSeen, filterAvatar } from "../../utils/lastSeen";
import { contactsService } from "../contacts/contacts.service";
import { createSystemMessage } from "../messages/systemMessages";
import { pushService } from "../push/push.service";
import { deleteUploadedFiles } from "../media/upload";
import { isInQuietHours, isNotificationsPaused } from "../../utils/notificationPreferences";
import {
  AddParticipantInput,
  BanUserByIdInput,
  CreateConversationInput,
  CreateInviteLinkInput,
  JoinByInviteInput,
  PinMessageInput,
  UpdateConversationInput,
  UpdateParticipantRestrictionInput,
  UpdatePreferencesInput,
} from "./chats.schema";


const userSummarySelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  publicKey: true,
  lastSeenAt: true,
  lastSeenPrivacy: true,
  avatarPrivacy: true,
  readReceiptsEnabled: true,
} as const;

const MUTE_DURATIONS_MS: Record<"1h" | "2h" | "8h" | "1d" | "2d" | "1w", number> = {
  "1h": 60 * 60 * 1000,
  "2h": 2 * 60 * 60 * 1000,
  "8h": 8 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "2d": 2 * 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
};

const RESTRICTION_DURATIONS_MS: Record<"1h" | "1d" | "1w", number> = {
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
  "1w": 7 * 24 * 60 * 60 * 1000,
};

// Sentinel for an indefinite ("Doimiy") restriction. Uses a 4-digit year
// (rather than the JS Date max) since Prisma's Postgres driver can't encode
// dates with a 5+ digit (`+`-prefixed) year.
const FAR_FUTURE = new Date("9999-12-31T23:59:59.999Z");

/** A conversation is muted if muted indefinitely, or muted until a time still in the future. */
export function isParticipantMuted(p: { isMuted: boolean; mutedUntil: Date | null }): boolean {
  return p.isMuted || (p.mutedUntil !== null && p.mutedUntil.getTime() > Date.now());
}

/** Renders a disappearing-messages duration for the system message, matching the mobile app's labels. */
function formatDisappearingDuration(seconds: number): string {
  const DAY = 24 * 60 * 60;
  if (seconds === DAY) return "24 soat";
  if (seconds % DAY === 0) return `${seconds / DAY} kun`;
  return `${Math.round(seconds / DAY)} kun`;
}

/** An invite link is usable if its code hasn't expired and hasn't hit its usage limit. */
function isInviteLinkUsable(conversation: {
  inviteCodeExpiresAt: Date | null;
  inviteCodeMaxUses: number | null;
  inviteCodeUseCount: number;
}): boolean {
  if (conversation.inviteCodeExpiresAt && conversation.inviteCodeExpiresAt.getTime() <= Date.now()) return false;
  if (conversation.inviteCodeMaxUses !== null && conversation.inviteCodeUseCount >= conversation.inviteCodeMaxUses) {
    return false;
  }
  return true;
}

// Strips a participant's `lastReadAt` (read receipt) unless both the viewer and that
// participant have read receipts enabled. Viewers always see their own `lastReadAt`.
// Combines a user's global readReceiptsEnabled setting with their
// per-conversation override (if any) for this conversation.
function effectiveReadReceipts(override: "DEFAULT" | "ON" | "OFF", globalEnabled: boolean): boolean {
  if (override === "ON") return true;
  if (override === "OFF") return false;
  return globalEnabled;
}

function visibleLastReadAt(
  viewerId: string,
  viewerEffectiveReadReceipts: boolean,
  participant: {
    userId: string;
    lastReadAt: Date | null;
    readReceiptsOverride: "DEFAULT" | "ON" | "OFF";
    user: { readReceiptsEnabled: boolean };
  }
): Date | null {
  if (participant.userId === viewerId) return participant.lastReadAt;
  const participantEffective = effectiveReadReceipts(participant.readReceiptsOverride, participant.user.readReceiptsEnabled);
  return viewerEffectiveReadReceipts && participantEffective ? participant.lastReadAt : null;
}

// Removes the cleartext `readReceiptsEnabled` and `lastSeenPrivacy` flags from a
// participant's user object before returning it to other participants.
function omitPrivacyFlags<T extends { readReceiptsEnabled: boolean }>(user: T): Omit<T, "readReceiptsEnabled"> {
  const { readReceiptsEnabled, ...rest } = user;
  return rest;
}

const pinnedMessageFields = {
  id: true,
  senderId: true,
  type: true,
  ciphertext: true,
  nonce: true,
  mediaUrl: true,
  deletedAt: true,
} as const;

const pinnedMessagesInclude = {
  orderBy: { pinnedAt: "desc" as const },
  include: { message: { select: pinnedMessageFields } },
} as const;

export const chatsService = {
  async createConversation(userId: string, input: CreateConversationInput) {
    if (!input.participants.some((p) => p.userId === userId)) {
      throw Errors.badRequest("Siz ham ishtirokchilar ro'yxatida bo'lishingiz kerak");
    }

    const participantIds = input.participants.map((p) => p.userId);
    const users = await prisma.user.findMany({ where: { id: { in: participantIds } } });
    if (users.length !== new Set(participantIds).size) {
      throw Errors.badRequest("Ishtirokchilardan biri topilmadi");
    }

    if (input.type === "GROUP") {
      await chatsService.assertCanAddToGroup(
        userId,
        users.filter((u) => u.id !== userId)
      );
    }

    if (input.type === "DIRECT" && input.participants.length === 1) {
      const existing = await prisma.conversation.findFirst({
        where: { type: ConversationType.DIRECT, isSelf: true, participants: { some: { userId } } },
      });
      if (existing) return chatsService.getConversation(userId, existing.id);
    } else if (input.type === "DIRECT") {
      const otherId = participantIds.find((id) => id !== userId)!;
      const existing = await prisma.conversation.findFirst({
        where: {
          type: ConversationType.DIRECT,
          participants: { some: { userId } },
          AND: { participants: { some: { userId: otherId } } },
        },
        include: { participants: true },
      });
      if (existing && existing.participants.length === 2) {
        return chatsService.getConversation(userId, existing.id);
      }

      const otherUser = users.find((u) => u.id === otherId)!;
      await chatsService.assertCanMessage(userId, otherUser);
    }

    const creator = users.find((u) => u.id === userId)!;

    const conversation = await prisma.conversation.create({
      data: {
        type: input.type === "GROUP" ? ConversationType.GROUP : ConversationType.DIRECT,
        title: input.title,
        isSelf: input.type === "DIRECT" && input.participants.length === 1,
        disappearingSeconds: creator.defaultDisappearingSeconds,
        participants: {
          create: input.participants.map((p) => ({
            userId: p.userId,
            role:
              input.type === "GROUP" && p.userId === userId
                ? ParticipantRole.OWNER
                : ParticipantRole.MEMBER,
            wrappedKey: p.wrappedKey,
            wrappedKeyNonce: p.wrappedKeyNonce,
            keySenderPublicKey: input.keySenderPublicKey,
          })),
        },
      },
    });

    return chatsService.getConversation(userId, conversation.id);
  },

  async listConversations(userId: string) {
    const [participations, blocked, contactIds, exceptions, viewer] = await Promise.all([
      prisma.conversationParticipant.findMany({
        where: { userId },
        include: {
          conversation: {
            include: {
              participants: { include: { user: { select: userSummarySelect } } },
              messages: { where: { scheduledFor: null }, orderBy: { createdAt: "desc" }, take: 1 },
              pinnedMessages: pinnedMessagesInclude,
            },
          },
        },
        orderBy: [
          { pinnedOrder: { sort: "asc", nulls: "last" } },
          { pinnedAt: { sort: "desc", nulls: "last" } },
          { conversation: { updatedAt: "desc" } },
        ],
      }),
      prisma.blockedUser.findMany({ where: { ownerId: userId }, select: { blockedId: true } }),
      getContactIds(userId),
      getLastSeenExceptions(userId),
      prisma.user.findUnique({ where: { id: userId }, select: { readReceiptsEnabled: true } }),
    ]);
    const viewerReadReceiptsEnabled = viewer?.readReceiptsEnabled ?? true;

    const blockedIds = new Set(blocked.map((b) => b.blockedId));

    // Latest @-mention timestamp per conversation, used to flag conversations
    // with an unread mention regardless of whether it's the most recent message.
    const mentionRows =
      participations.length === 0
        ? []
        : await prisma.message.groupBy({
            by: ["conversationId"],
            where: {
              conversationId: { in: participations.map((p) => p.conversationId) },
              mentions: { has: userId },
              deletedAt: null,
              NOT: { hiddenFor: { has: userId } },
            },
            _max: { createdAt: true },
          });
    const latestMentionByConversation = new Map(mentionRows.map((r) => [r.conversationId, r._max.createdAt]));

    return participations
      .filter((p) => {
        if (!p.hiddenAt) return true;
        const lastMessage = p.conversation.messages[0];
        return !!lastMessage && lastMessage.createdAt > p.hiddenAt;
      })
      .map((p) => {
        const other = p.conversation.participants.find((cp) => cp.userId !== userId);
        const viewerEffectiveReadReceipts = effectiveReadReceipts(p.readReceiptsOverride, viewerReadReceiptsEnabled);
        return {
          id: p.conversation.id,
          type: p.conversation.type,
          title: p.conversation.title,
          description: p.conversation.description,
          welcomeMessage: p.conversation.welcomeMessage,
          avatarUrl: p.conversation.avatarUrl,
          updatedAt: p.conversation.updatedAt,
          wrappedKey: p.wrappedKey,
          wrappedKeyNonce: p.wrappedKeyNonce,
          keySenderPublicKey: p.keySenderPublicKey,
          lastReadAt: p.lastReadAt,
          isPinned: !!p.pinnedAt,
          isMuted: isParticipantMuted(p),
          mutedUntil: p.mutedUntil,
          isArchived: p.isArchived,
          markedUnread: p.markedUnread,
          notificationPreview: p.notificationPreview,
          readReceiptsOverride: p.readReceiptsOverride,
          mutedSenderIds: p.mutedSenderIds,
          autoDeleteAfterSeconds: p.autoDeleteAfterSeconds,
          isBlocked: p.conversation.type === ConversationType.DIRECT && !!other && blockedIds.has(other.userId),
          inviteCode: p.role === ParticipantRole.MEMBER ? null : p.conversation.inviteCode,
          inviteCodeExpiresAt: p.role === ParticipantRole.MEMBER ? null : p.conversation.inviteCodeExpiresAt,
          inviteCodeMaxUses: p.role === ParticipantRole.MEMBER ? null : p.conversation.inviteCodeMaxUses,
          inviteCodeUseCount: p.role === ParticipantRole.MEMBER ? null : p.conversation.inviteCodeUseCount,
          disappearingSeconds: p.conversation.disappearingSeconds,
          onlyAdminsCanSend: p.conversation.onlyAdminsCanSend,
          slowModeSeconds: p.conversation.slowModeSeconds,
          noForwards: p.conversation.noForwards,
          requireAdminApproval: p.conversation.requireAdminApproval,
          membersCanAddMembers: p.conversation.membersCanAddMembers,
          membersCanPinMessages: p.conversation.membersCanPinMessages,
          membersCanChangeInfo: p.conversation.membersCanChangeInfo,
          membersCanSendMedia: p.conversation.membersCanSendMedia,
          membersCanSendPolls: p.conversation.membersCanSendPolls,
          hideHistoryForNewMembers: p.conversation.hideHistoryForNewMembers,
          hideMembersList: p.conversation.hideMembersList,
          reactionsEnabled: p.conversation.reactionsEnabled,
          isSelf: p.conversation.isSelf,
          pinnedMessages: p.conversation.pinnedMessages.map((pm) => ({ ...pm.message, pinnedAt: pm.pinnedAt, expiresAt: pm.expiresAt, pinnedBy: pm.pinnedBy })),
          participants: p.conversation.participants.map((cp) => ({
            userId: cp.userId,
            role: cp.role,
            user: omitPrivacyFlags(
              filterAvatar(userId, filterLastSeen(userId, cp.user, contactIds, exceptions), contactIds)
            ),
            lastReadAt: visibleLastReadAt(userId, viewerEffectiveReadReceipts, cp),
            lastDeliveredAt: cp.lastDeliveredAt,
            restrictedUntil: cp.restrictedUntil,
            customTitle: cp.customTitle,
            joinedAt: cp.joinedAt,
          })),
          lastMessage:
            p.clearedAt && p.conversation.messages[0] && p.conversation.messages[0].createdAt <= p.clearedAt
              ? null
              : p.conversation.messages[0] ?? null,
          hasUnreadMention: (() => {
            const latestMention = latestMentionByConversation.get(p.conversation.id);
            if (!latestMention) return false;
            if (p.lastReadAt && latestMention <= p.lastReadAt) return false;
            if (p.clearedAt && latestMention <= p.clearedAt) return false;
            return true;
          })(),
        };
      });
  },

  async getConversation(userId: string, conversationId: string) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      include: {
        conversation: {
          include: {
            participants: { include: { user: { select: userSummarySelect } } },
            pinnedMessages: pinnedMessagesInclude,
          },
        },
      },
    });
    if (!participant) throw Errors.notFound("Suhbat");

    let isBlocked = false;
    if (participant.conversation.type === ConversationType.DIRECT) {
      const other = participant.conversation.participants.find((cp) => cp.userId !== userId);
      if (other) isBlocked = await contactsService.hasBlocked(userId, other.userId);
    }

    const [contactIds, exceptions, viewer] = await Promise.all([
      getContactIds(userId),
      getLastSeenExceptions(userId),
      prisma.user.findUnique({ where: { id: userId }, select: { readReceiptsEnabled: true } }),
    ]);
    const viewerReadReceiptsEnabled = viewer?.readReceiptsEnabled ?? true;
    const viewerEffectiveReadReceipts = effectiveReadReceipts(participant.readReceiptsOverride, viewerReadReceiptsEnabled);

    return {
      id: participant.conversation.id,
      type: participant.conversation.type,
      title: participant.conversation.title,
      description: participant.conversation.description,
      welcomeMessage: participant.conversation.welcomeMessage,
      avatarUrl: participant.conversation.avatarUrl,
      updatedAt: participant.conversation.updatedAt,
      wrappedKey: participant.wrappedKey,
      wrappedKeyNonce: participant.wrappedKeyNonce,
      keySenderPublicKey: participant.keySenderPublicKey,
      lastReadAt: participant.lastReadAt,
      isPinned: !!participant.pinnedAt,
      isMuted: isParticipantMuted(participant),
      mutedUntil: participant.mutedUntil,
      isArchived: participant.isArchived,
      markedUnread: participant.markedUnread,
      notificationPreview: participant.notificationPreview,
      readReceiptsOverride: participant.readReceiptsOverride,
      mutedSenderIds: participant.mutedSenderIds,
      autoDeleteAfterSeconds: participant.autoDeleteAfterSeconds,
      isBlocked,
      inviteCode: participant.role === ParticipantRole.MEMBER ? null : participant.conversation.inviteCode,
      inviteCodeExpiresAt:
        participant.role === ParticipantRole.MEMBER ? null : participant.conversation.inviteCodeExpiresAt,
      inviteCodeMaxUses:
        participant.role === ParticipantRole.MEMBER ? null : participant.conversation.inviteCodeMaxUses,
      inviteCodeUseCount:
        participant.role === ParticipantRole.MEMBER ? null : participant.conversation.inviteCodeUseCount,
      disappearingSeconds: participant.conversation.disappearingSeconds,
      onlyAdminsCanSend: participant.conversation.onlyAdminsCanSend,
      slowModeSeconds: participant.conversation.slowModeSeconds,
      noForwards: participant.conversation.noForwards,
      requireAdminApproval: participant.conversation.requireAdminApproval,
      membersCanAddMembers: participant.conversation.membersCanAddMembers,
      membersCanPinMessages: participant.conversation.membersCanPinMessages,
      membersCanChangeInfo: participant.conversation.membersCanChangeInfo,
      membersCanSendMedia: participant.conversation.membersCanSendMedia,
      membersCanSendPolls: participant.conversation.membersCanSendPolls,
      hideHistoryForNewMembers: participant.conversation.hideHistoryForNewMembers,
      hideMembersList: participant.conversation.hideMembersList,
      reactionsEnabled: participant.conversation.reactionsEnabled,
      isSelf: participant.conversation.isSelf,
      pinnedMessages: participant.conversation.pinnedMessages.map((pm) => ({ ...pm.message, pinnedAt: pm.pinnedAt, expiresAt: pm.expiresAt, pinnedBy: pm.pinnedBy })),
      participants: participant.conversation.participants.map((cp) => ({
        userId: cp.userId,
        role: cp.role,
        user: omitPrivacyFlags(
          filterAvatar(userId, filterLastSeen(userId, cp.user, contactIds, exceptions), contactIds)
        ),
        lastReadAt: visibleLastReadAt(userId, viewerEffectiveReadReceipts, cp),
        lastDeliveredAt: cp.lastDeliveredAt,
        restrictedUntil: cp.restrictedUntil,
        customTitle: cp.customTitle,
        joinedAt: cp.joinedAt,
      })),
    };
  },

  async updatePreferences(userId: string, conversationId: string, input: UpdatePreferencesInput) {
    const participant = await chatsService.assertParticipant(userId, conversationId);

    let muteData: { isMuted?: boolean; mutedUntil?: Date | null } = {};
    if (input.muteFor === "off") muteData = { isMuted: false, mutedUntil: null };
    else if (input.muteFor === "forever") muteData = { isMuted: true, mutedUntil: null };
    else if (input.muteFor !== undefined)
      muteData = { isMuted: false, mutedUntil: new Date(Date.now() + MUTE_DURATIONS_MS[input.muteFor]) };

    let pinData: { pinnedAt?: Date | null; pinnedOrder?: number | null } = {};
    if (input.isPinned !== undefined) {
      if (input.isPinned) {
        // New pins go to the top of the pinned list, like the previous
        // pinnedAt-only ordering did.
        const top = await prisma.conversationParticipant.aggregate({
          where: { userId, pinnedAt: { not: null } },
          _min: { pinnedOrder: true },
        });
        pinData = { pinnedAt: new Date(), pinnedOrder: (top._min.pinnedOrder ?? 0) - 1 };
      } else {
        pinData = { pinnedAt: null, pinnedOrder: null };
      }
    }

    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: {
        ...pinData,
        ...muteData,
        ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
        ...(input.markedUnread !== undefined ? { markedUnread: input.markedUnread } : {}),
        ...(input.notificationPreview !== undefined ? { notificationPreview: input.notificationPreview } : {}),
        ...(input.readReceiptsOverride !== undefined ? { readReceiptsOverride: input.readReceiptsOverride } : {}),
        ...(input.mutedSenderIds !== undefined ? { mutedSenderIds: input.mutedSenderIds } : {}),
        ...(input.autoDeleteAfterSeconds !== undefined ? { autoDeleteAfterSeconds: input.autoDeleteAfterSeconds } : {}),
      },
    });

    return chatsService.getConversation(userId, conversationId);
  },

  /** Moves a pinned conversation up or down relative to the user's other pinned conversations. */
  async reorderPinned(userId: string, conversationId: string, direction: "up" | "down") {
    const pinned = await prisma.conversationParticipant.findMany({
      where: { userId, pinnedAt: { not: null } },
      orderBy: [{ pinnedOrder: { sort: "asc", nulls: "last" } }, { pinnedAt: "desc" }],
    });

    const index = pinned.findIndex((p) => p.conversationId === conversationId);
    if (index === -1) throw Errors.notFound("Suhbat");

    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex >= 0 && swapIndex < pinned.length) {
      await prisma.$transaction(
        pinned.map((p, i) => {
          const order = i === index ? swapIndex : i === swapIndex ? index : i;
          return prisma.conversationParticipant.update({ where: { id: p.id }, data: { pinnedOrder: order } });
        })
      );
    }

    return chatsService.listConversations(userId);
  },

  /**
   * Hides messages from this user's view of the conversation up to a cutoff time.
   * With no `olderThanDays`, clears everything sent so far. Otherwise, only
   * messages older than that many days are hidden (the cutoff never moves
   * earlier than a previous clear).
   */
  async clearHistory(userId: string, conversationId: string, olderThanDays?: number) {
    const participant = await chatsService.assertParticipant(userId, conversationId);

    const cutoff = olderThanDays ? new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000) : new Date();
    const clearedAt = participant.clearedAt && participant.clearedAt > cutoff ? participant.clearedAt : cutoff;

    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { clearedAt },
    });
  },

  /**
   * Removes a conversation from this user's chat list and clears its history
   * for them. The other participant(s) are unaffected, and the conversation
   * reappears in this user's list once a newer message arrives.
   */
  async deleteConversation(userId: string, conversationId: string) {
    const participant = await chatsService.assertParticipant(userId, conversationId);

    const now = new Date();
    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { hiddenAt: now, clearedAt: now, pinnedAt: null, isArchived: false, markedUnread: false },
    });
  },

  /**
   * Removes (hides + clears) conversations the user enabled "auto-delete after
   * inactivity" for, once no new message has arrived since `autoDeleteAfterSeconds`
   * after the conversation's last activity. Pinned conversations are exempt.
   * Idempotent: a chat won't be re-removed until a new message arrives and the
   * inactivity window elapses again.
   */
  async applyInactivityAutoDeletes() {
    const candidates = await prisma.conversationParticipant.findMany({
      where: { autoDeleteAfterSeconds: { not: null }, pinnedAt: null },
      select: {
        id: true,
        userId: true,
        conversationId: true,
        hiddenAt: true,
        autoDeleteAfterSeconds: true,
        conversation: { select: { updatedAt: true } },
      },
    });

    const now = Date.now();
    const due = candidates.filter((p) => {
      const threshold = p.conversation.updatedAt.getTime() + p.autoDeleteAfterSeconds! * 1000;
      if (threshold > now) return false;
      return !p.hiddenAt || p.hiddenAt < p.conversation.updatedAt;
    });
    if (due.length === 0) return [];

    const nowDate = new Date();
    await prisma.conversationParticipant.updateMany({
      where: { id: { in: due.map((p) => p.id) } },
      data: { hiddenAt: nowDate, clearedAt: nowDate, isArchived: false, markedUnread: false },
    });

    return due.map((p) => ({ userId: p.userId, conversationId: p.conversationId }));
  },

  /**
   * Permanently deletes a DIRECT conversation and all its messages for both
   * participants. Not available for GROUPs (use leave/removeParticipant) or
   * the "Saved Messages" self-chat.
   */
  async deleteConversationForEveryone(userId: string, conversationId: string) {
    await chatsService.assertParticipant(userId, conversationId);

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { type: true, isSelf: true },
    });
    if (!conversation) throw Errors.notFound("Suhbat");
    if (conversation.type !== ConversationType.DIRECT || conversation.isSelf) {
      throw Errors.badRequest("Bu suhbatni hammaga o'chirib bo'lmaydi");
    }

    const mediaMessages = await prisma.message.findMany({
      where: { conversationId, mediaUrl: { not: null } },
      select: { mediaUrl: true },
    });

    await prisma.conversation.delete({ where: { id: conversationId } });

    await deleteUploadedFiles(mediaMessages.map((m) => m.mediaUrl));
  },

  /** GROUP conversations where both userId and otherUserId are participants. */
  async listCommonGroups(userId: string, otherUserId: string) {
    const groups = await prisma.conversation.findMany({
      where: {
        type: ConversationType.GROUP,
        AND: [{ participants: { some: { userId } } }, { participants: { some: { userId: otherUserId } } }],
      },
      select: {
        id: true,
        title: true,
        avatarUrl: true,
        _count: { select: { participants: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return groups.map((g) => ({
      id: g.id,
      title: g.title,
      avatarUrl: g.avatarUrl,
      memberCount: g._count.participants,
    }));
  },

  async pinMessage(userId: string, conversationId: string, messageId: string, input: PinMessageInput) {
    await chatsService.assertCanManagePins(userId, conversationId);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId) throw Errors.notFound("Xabar");
    if (message.deletedAt) throw Errors.badRequest("O'chirilgan xabarni qadab bo'lmaydi");

    const alreadyPinned = await prisma.pinnedMessage.findUnique({
      where: { conversationId_messageId: { conversationId, messageId } },
    });

    const expiresAt = input.expiresInSeconds ? new Date(Date.now() + input.expiresInSeconds * 1000) : null;

    await prisma.pinnedMessage.upsert({
      where: { conversationId_messageId: { conversationId, messageId } },
      create: { conversationId, messageId, pinnedBy: userId, expiresAt },
      update: { expiresAt },
    });

    let systemMessage = null;
    if (!alreadyPinned) {
      if (input.notify !== false) {
        const actor = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
        systemMessage = await createSystemMessage(conversationId, userId, `${actor?.displayName} xabarni qadab qo'ydi`);
      }
      await chatsService.logGroupAction(conversationId, userId, GroupAuditAction.MESSAGE_PINNED, message.senderId, message.type);
    }

    return { conversation: await chatsService.getConversation(userId, conversationId), systemMessage };
  },

  async unpinMessage(userId: string, conversationId: string, messageId: string) {
    await chatsService.assertCanManagePins(userId, conversationId);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    const { count } = await prisma.pinnedMessage.deleteMany({ where: { conversationId, messageId } });
    if (count > 0 && message) {
      await chatsService.logGroupAction(conversationId, userId, GroupAuditAction.MESSAGE_UNPINNED, message.senderId, message.type);
    }

    return chatsService.getConversation(userId, conversationId);
  },

  async unpinAllMessages(userId: string, conversationId: string) {
    await chatsService.assertCanManagePins(userId, conversationId);

    const { count } = await prisma.pinnedMessage.deleteMany({ where: { conversationId } });
    if (count > 0) {
      await chatsService.logGroupAction(conversationId, userId, GroupAuditAction.ALL_MESSAGES_UNPINNED, null, String(count));
    }

    return chatsService.getConversation(userId, conversationId);
  },

  /** Removes pinned messages whose temporary-pin duration has passed. */
  async unpinExpiredMessages() {
    const due = await prisma.pinnedMessage.findMany({
      where: { expiresAt: { lte: new Date() } },
      select: { id: true, conversationId: true, messageId: true },
    });
    if (due.length === 0) return [];

    await prisma.pinnedMessage.deleteMany({ where: { id: { in: due.map((p) => p.id) } } });
    return due.map(({ conversationId, messageId }) => ({ conversationId, messageId }));
  },

  async setDisappearingMessages(userId: string, conversationId: string, disappearingSeconds: number | null) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });
    if (!conversation) throw Errors.notFound("Suhbat");

    const requester = conversation.participants.find((p) => p.userId === userId);
    if (!requester) throw Errors.forbidden();
    if (
      conversation.type === ConversationType.GROUP &&
      requester.role !== ParticipantRole.OWNER &&
      requester.role !== ParticipantRole.ADMIN
    ) {
      throw Errors.forbidden();
    }

    let systemMessage = null;
    if (disappearingSeconds !== conversation.disappearingSeconds) {
      await prisma.conversation.update({ where: { id: conversationId }, data: { disappearingSeconds } });
      const actor = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
      systemMessage = await createSystemMessage(
        conversationId,
        userId,
        disappearingSeconds
          ? `${actor?.displayName} o'chiriladigan xabarlar taymerini ${formatDisappearingDuration(disappearingSeconds)}ga o'rnatdi`
          : `${actor?.displayName} o'chiriladigan xabarlar taymerini o'chirdi`
      );
      if (conversation.type === ConversationType.GROUP) {
        await chatsService.logGroupAction(conversationId, userId, GroupAuditAction.GROUP_SETTINGS_CHANGED, null, "disappearingSeconds");
      }
    }

    return { conversation: await chatsService.getConversation(userId, conversationId), systemMessage };
  },

  /**
   * DIRECT only: either participant can toggle "restrict saving content" to
   * prevent both sides from forwarding, copying, or exporting messages.
   */
  async setNoForwards(userId: string, conversationId: string, noForwards: boolean) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });
    if (!conversation) throw Errors.notFound("Suhbat");
    if (conversation.type !== ConversationType.DIRECT) {
      throw Errors.badRequest("Bu amal faqat shaxsiy suhbatlar uchun mavjud");
    }

    const requester = conversation.participants.find((p) => p.userId === userId);
    if (!requester) throw Errors.forbidden();

    let systemMessage = null;
    if (noForwards !== conversation.noForwards) {
      await prisma.conversation.update({ where: { id: conversationId }, data: { noForwards } });
      const actor = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
      systemMessage = await createSystemMessage(
        conversationId,
        userId,
        noForwards
          ? `${actor?.displayName} nusxalash va yo'naltirishni man qildi`
          : `${actor?.displayName} nusxalash va yo'naltirishga ruxsat berdi`
      );
    }

    return { conversation: await chatsService.getConversation(userId, conversationId), systemMessage };
  },

  async assertGroupManager(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });
    if (!conversation) throw Errors.notFound("Suhbat");
    if (conversation.type !== ConversationType.GROUP) {
      throw Errors.badRequest("Bu amal faqat guruhlar uchun mavjud");
    }

    const requester = conversation.participants.find((p) => p.userId === userId);
    if (!requester || (requester.role !== ParticipantRole.OWNER && requester.role !== ParticipantRole.ADMIN)) {
      throw Errors.forbidden();
    }

    return conversation;
  },

  /** Records a moderation action in a GROUP's "Recent actions" log. */
  async logGroupAction(
    conversationId: string,
    actorId: string,
    action: GroupAuditAction,
    targetUserId?: string | null,
    details?: string | null
  ) {
    await prisma.groupAuditLogEntry.create({
      data: { conversationId, actorId, action, targetUserId: targetUserId ?? null, details: details ?? null },
    });
  },

  /** GROUP only, OWNER/ADMIN only: paginated log of moderation actions. */
  async getAuditLog(userId: string, conversationId: string, before?: string) {
    await chatsService.assertGroupManager(userId, conversationId);

    const entries = await prisma.groupAuditLogEntry.findMany({
      where: { conversationId, ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const userIds = new Set<string>();
    for (const entry of entries) {
      userIds.add(entry.actorId);
      if (entry.targetUserId) userIds.add(entry.targetUserId);
    }
    const users = await prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, displayName: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return entries.map((entry) => ({
      id: entry.id,
      action: entry.action,
      details: entry.details,
      createdAt: entry.createdAt,
      actor: userMap.get(entry.actorId) ?? null,
      target: entry.targetUserId ? userMap.get(entry.targetUserId) ?? null : null,
    }));
  },

  async createInviteLink(userId: string, conversationId: string, input?: CreateInviteLinkInput) {
    await chatsService.assertGroupManager(userId, conversationId);

    const expiresAt = input?.expiresInSeconds ? new Date(Date.now() + input.expiresInSeconds * 1000) : null;
    const maxUses = input?.maxUses ?? null;

    for (let attempt = 0; attempt < 5; attempt++) {
      const inviteCode = crypto.randomBytes(6).toString("base64url");
      try {
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { inviteCode, inviteCodeExpiresAt: expiresAt, inviteCodeMaxUses: maxUses, inviteCodeUseCount: 0 },
        });
        await chatsService.logGroupAction(conversationId, userId, GroupAuditAction.INVITE_LINK_RESET);
        return { inviteCode, inviteCodeExpiresAt: expiresAt, inviteCodeMaxUses: maxUses, inviteCodeUseCount: 0 };
      } catch (err: any) {
        if (err?.code !== "P2002") throw err;
      }
    }
    throw Errors.badRequest("Taklif havolasini yaratib bo'lmadi");
  },

  async revokeInviteLink(userId: string, conversationId: string) {
    const conversation = await chatsService.assertGroupManager(userId, conversationId);
    if (!conversation.inviteCode) return;

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { inviteCode: null, inviteCodeExpiresAt: null, inviteCodeMaxUses: null, inviteCodeUseCount: 0 },
    });
    await chatsService.logGroupAction(conversationId, userId, GroupAuditAction.INVITE_LINK_REVOKED);
  },

  async getInvitePreview(code: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { inviteCode: code },
      include: { participants: true },
    });
    if (!conversation) throw Errors.notFound("Taklif havolasi");
    if (!isInviteLinkUsable(conversation)) throw Errors.notFound("Taklif havolasi");

    return {
      id: conversation.id,
      type: conversation.type,
      title: conversation.title,
      description: conversation.description,
      avatarUrl: conversation.avatarUrl,
      memberCount: conversation.participants.length,
    };
  },

  async joinByInvite(userId: string, code: string, input: JoinByInviteInput) {
    const conversation = await prisma.conversation.findUnique({
      where: { inviteCode: code },
      include: { participants: true },
    });
    if (!conversation) throw Errors.notFound("Taklif havolasi");

    const alreadyMember = conversation.participants.some((p) => p.userId === userId);
    if (alreadyMember) {
      return {
        pending: false as const,
        conversation: await chatsService.getConversation(userId, conversation.id),
        alreadyMember: true,
        systemMessages: [],
      };
    }

    if (!isInviteLinkUsable(conversation)) throw Errors.notFound("Taklif havolasi");

    const ban = await prisma.groupBan.findUnique({
      where: { conversationId_bannedUserId: { conversationId: conversation.id, bannedUserId: userId } },
    });
    if (ban) throw Errors.notFound("Taklif havolasi");

    if (conversation.requireAdminApproval) {
      await prisma.groupJoinRequest.upsert({
        where: { conversationId_userId: { conversationId: conversation.id, userId } },
        update: {
          wrappedKey: input.wrappedKey,
          wrappedKeyNonce: input.wrappedKeyNonce,
          keySenderPublicKey: input.keySenderPublicKey,
        },
        create: {
          conversationId: conversation.id,
          userId,
          wrappedKey: input.wrappedKey,
          wrappedKeyNonce: input.wrappedKeyNonce,
          keySenderPublicKey: input.keySenderPublicKey,
        },
      });

      const requester = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
      const managerIds = conversation.participants
        .filter((p) => p.role === ParticipantRole.OWNER || p.role === ParticipantRole.ADMIN)
        .map((p) => p.userId);
      await pushService.sendToUsers(managerIds, {
        title: "Guruhga qo'shilish so'rovi",
        body: `${requester?.displayName} "${conversation.title}" guruhiga qo'shilishni so'rayapti`,
        data: { type: "group_join_request", conversationId: conversation.id },
      });

      return { pending: true as const, conversationId: conversation.id, managerIds };
    }

    await prisma.$transaction([
      prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId,
          role: ParticipantRole.MEMBER,
          wrappedKey: input.wrappedKey,
          wrappedKeyNonce: input.wrappedKeyNonce,
          keySenderPublicKey: input.keySenderPublicKey,
        },
      }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data: { inviteCodeUseCount: { increment: 1 } },
      }),
    ]);

    await chatsService.logGroupAction(conversation.id, userId, GroupAuditAction.MEMBER_ADDED, userId);

    const joiner = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
    const systemMessages = [await createSystemMessage(conversation.id, userId, `${joiner?.displayName} guruhga qo'shildi`)];
    if (conversation.welcomeMessage) {
      systemMessages.push(await createSystemMessage(conversation.id, userId, conversation.welcomeMessage));
    }

    return {
      pending: false as const,
      conversation: await chatsService.getConversation(userId, conversation.id),
      alreadyMember: false,
      systemMessages,
    };
  },

  async listJoinRequests(userId: string, conversationId: string) {
    await chatsService.assertGroupManager(userId, conversationId);

    const requests = await prisma.groupJoinRequest.findMany({
      where: { conversationId },
      include: { user: { select: userSummarySelect } },
      orderBy: { createdAt: "desc" },
    });
    const [contactIds, exceptions] = await Promise.all([getContactIds(userId), getLastSeenExceptions(userId)]);
    return requests.map((r) => ({
      id: r.id,
      user: omitPrivacyFlags(filterAvatar(userId, filterLastSeen(userId, r.user, contactIds, exceptions), contactIds)),
      createdAt: r.createdAt,
    }));
  },

  async approveJoinRequest(userId: string, conversationId: string, requestId: string) {
    const conversation = await chatsService.assertGroupManager(userId, conversationId);

    const request = await prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
    if (!request || request.conversationId !== conversationId) throw Errors.notFound("So'rov");

    await prisma.$transaction([
      prisma.conversationParticipant.create({
        data: {
          conversationId,
          userId: request.userId,
          role: ParticipantRole.MEMBER,
          wrappedKey: request.wrappedKey,
          wrappedKeyNonce: request.wrappedKeyNonce,
          keySenderPublicKey: request.keySenderPublicKey,
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { inviteCodeUseCount: { increment: 1 } },
      }),
      prisma.groupJoinRequest.delete({ where: { id: requestId } }),
    ]);

    const joiner = await prisma.user.findUnique({ where: { id: request.userId }, select: { displayName: true } });
    const systemMessages = [await createSystemMessage(conversationId, request.userId, `${joiner?.displayName} guruhga qo'shildi`)];
    if (conversation.welcomeMessage) {
      systemMessages.push(await createSystemMessage(conversationId, request.userId, conversation.welcomeMessage));
    }

    await chatsService.logGroupAction(conversationId, userId, GroupAuditAction.MEMBER_ADDED, request.userId);

    await pushService.sendToUsers([request.userId], {
      title: "So'rov qabul qilindi",
      body: `"${conversation.title}" guruhiga qo'shilish so'rovingiz qabul qilindi`,
      data: { type: "group_join_approved", conversationId },
    });

    const otherManagerIds = conversation.participants
      .filter((p) => (p.role === ParticipantRole.OWNER || p.role === ParticipantRole.ADMIN) && p.userId !== userId)
      .map((p) => p.userId);

    return {
      conversation: await chatsService.getConversation(userId, conversationId),
      systemMessages,
      newParticipantId: request.userId,
      otherManagerIds,
    };
  },

  async declineJoinRequest(userId: string, conversationId: string, requestId: string) {
    const conversation = await chatsService.assertGroupManager(userId, conversationId);

    const request = await prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
    if (!request || request.conversationId !== conversationId) throw Errors.notFound("So'rov");

    await prisma.groupJoinRequest.delete({ where: { id: requestId } });

    await pushService.sendToUsers([request.userId], {
      title: "So'rov rad etildi",
      body: `"${conversation.title}" guruhiga qo'shilish so'rovingiz rad etildi`,
      data: { type: "group_join_declined", conversationId },
    });

    const otherManagerIds = conversation.participants
      .filter((p) => (p.role === ParticipantRole.OWNER || p.role === ParticipantRole.ADMIN) && p.userId !== userId)
      .map((p) => p.userId);

    return { otherManagerIds };
  },

  // Pending requests the current user has sent to join groups via invite links
  // that require admin approval, awaiting a decision.
  async listMyJoinRequests(userId: string) {
    const requests = await prisma.groupJoinRequest.findMany({
      where: { userId },
      include: { conversation: { include: { participants: true } } },
      orderBy: { createdAt: "desc" },
    });

    return requests.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      conversation: {
        id: r.conversation.id,
        title: r.conversation.title,
        avatarUrl: r.conversation.avatarUrl,
        memberCount: r.conversation.participants.length,
      },
    }));
  },

  async cancelMyJoinRequest(userId: string, requestId: string) {
    const request = await prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
    if (!request || request.userId !== userId) throw Errors.notFound("So'rov");
    await prisma.groupJoinRequest.delete({ where: { id: requestId } });
  },

  async addParticipant(userId: string, conversationId: string, input: AddParticipantInput) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });
    if (!conversation) throw Errors.notFound("Suhbat");
    if (conversation.type !== ConversationType.GROUP) {
      throw Errors.badRequest("Faqat guruhlarga a'zo qo'shish mumkin");
    }

    const requester = conversation.participants.find((p) => p.userId === userId);
    if (!requester) throw Errors.forbidden();
    const isManager = requester.role === ParticipantRole.OWNER || requester.role === ParticipantRole.ADMIN;
    if (!isManager && !conversation.membersCanAddMembers) {
      throw Errors.forbidden();
    }

    if (conversation.participants.some((p) => p.userId === input.userId)) {
      throw Errors.conflict("Foydalanuvchi allaqachon guruh a'zosi");
    }

    const ban = await prisma.groupBan.findUnique({
      where: { conversationId_bannedUserId: { conversationId, bannedUserId: input.userId } },
    });
    if (ban) throw Errors.forbidden("Foydalanuvchi ushbu guruhdan bloklangan");

    const target = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!target) throw Errors.notFound("Foydalanuvchi");

    await chatsService.assertCanAddToGroup(userId, [target]);

    await prisma.conversationParticipant.create({
      data: {
        conversationId,
        userId: input.userId,
        role: ParticipantRole.MEMBER,
        wrappedKey: input.wrappedKey,
        wrappedKeyNonce: input.wrappedKeyNonce,
        keySenderPublicKey: input.keySenderPublicKey,
      },
    });

    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
    const systemMessages = [
      await createSystemMessage(conversationId, userId, `${actor?.displayName} ${target.displayName} foydalanuvchisini guruhga qo'shdi`),
    ];
    if (conversation.welcomeMessage) {
      systemMessages.push(await createSystemMessage(conversationId, input.userId, conversation.welcomeMessage));
    }

    await chatsService.logGroupAction(conversationId, userId, GroupAuditAction.MEMBER_ADDED, input.userId);

    await pushService.sendToUsers([input.userId], {
      title: "Guruhga qo'shildingiz",
      body: `${actor?.displayName} sizni "${conversation.title}" guruhiga qo'shdi`,
      data: { type: "group_added", conversationId },
    });

    return { conversation: await chatsService.getConversation(userId, conversationId), systemMessages };
  },

  async assertParticipant(userId: string, conversationId: string) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw Errors.forbidden();
    return participant;
  },

  /**
   * Returns the userIds of `conversationId`'s other participants who are
   * allowed to see `readerId`'s real-time "read" receipt, mirroring
   * `visibleLastReadAt`'s visibility rule for the `message:read` socket event.
   */
  async getReadReceiptViewers(conversationId: string, readerId: string): Promise<Set<string>> {
    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { userId: true, readReceiptsOverride: true, user: { select: { readReceiptsEnabled: true } } },
    });
    const reader = participants.find((p) => p.userId === readerId);
    if (!reader || !effectiveReadReceipts(reader.readReceiptsOverride, reader.user.readReceiptsEnabled)) {
      return new Set();
    }
    const visible = new Set<string>();
    for (const p of participants) {
      if (p.userId === readerId) continue;
      if (effectiveReadReceipts(p.readReceiptsOverride, p.user.readReceiptsEnabled)) visible.add(p.userId);
    }
    return visible;
  },

  /**
   * In a GROUP, only OWNER/ADMIN can pin/unpin messages, unless `membersCanPinMessages`
   * is enabled, in which case any MEMBER can too. In a DIRECT chat, either participant can.
   */
  async assertCanManagePins(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });
    if (!conversation) throw Errors.notFound("Suhbat");

    const requester = conversation.participants.find((p) => p.userId === userId);
    if (!requester) throw Errors.forbidden();
    if (
      conversation.type === ConversationType.GROUP &&
      requester.role !== ParticipantRole.OWNER &&
      requester.role !== ParticipantRole.ADMIN &&
      !conversation.membersCanPinMessages
    ) {
      throw Errors.forbidden();
    }

    return conversation;
  },

  /** Throws if `inviterId` is not allowed to add any of `targets` to a group, per their groupAddPrivacy. */
  async assertCanAddToGroup(inviterId: string, targets: { id: string; displayName: string; groupAddPrivacy: GroupAddPrivacy }[]) {
    if (targets.length === 0) return;

    const contactIds = await getContactIds(inviterId);
    for (const target of targets) {
      if (target.groupAddPrivacy === GroupAddPrivacy.NOBODY) {
        throw Errors.forbidden(`${target.displayName} foydalanuvchisini guruhga qo'shib bo'lmaydi`);
      }
      if (target.groupAddPrivacy === GroupAddPrivacy.CONTACTS && !contactIds.has(target.id)) {
        throw Errors.forbidden(`${target.displayName} foydalanuvchisini faqat uning kontaktlari guruhga qo'sha oladi`);
      }
    }
  },

  /** Throws if `senderId` may not start a new direct conversation with `target`, per their messagePrivacy. */
  async assertCanMessage(senderId: string, target: { id: string; displayName: string; messagePrivacy: MessagePrivacy }) {
    if (target.id === senderId) return;
    if (target.messagePrivacy === MessagePrivacy.NOBODY) {
      throw Errors.forbidden(`${target.displayName} foydalanuvchisi xabarlarni hech kimdan qabul qilmaydi`);
    }
    if (target.messagePrivacy === MessagePrivacy.CONTACTS) {
      const contactIds = await getContactIds(senderId);
      if (!contactIds.has(target.id)) {
        throw Errors.forbidden(`${target.displayName} foydalanuvchisi faqat o'z kontaktlaridan xabar qabul qiladi`);
      }
    }
  },

  async updateConversation(userId: string, conversationId: string, input: UpdateConversationInput) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });
    if (!conversation) throw Errors.notFound("Suhbat");
    if (conversation.type !== ConversationType.GROUP) {
      throw Errors.badRequest("Faqat guruh ma'lumotlarini tahrirlash mumkin");
    }

    const requester = conversation.participants.find((p) => p.userId === userId);
    if (!requester) throw Errors.forbidden();
    const isManager = requester.role === ParticipantRole.OWNER || requester.role === ParticipantRole.ADMIN;
    if (!isManager) {
      const infoOnlyFields: (keyof UpdateConversationInput)[] = ["title", "avatarUrl", "description"];
      const onlyInfoFields = Object.keys(input).every((key) => infoOnlyFields.includes(key as keyof UpdateConversationInput));
      if (!onlyInfoFields || !conversation.membersCanChangeInfo) throw Errors.forbidden();
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.welcomeMessage !== undefined ? { welcomeMessage: input.welcomeMessage } : {}),
        ...(input.onlyAdminsCanSend !== undefined ? { onlyAdminsCanSend: input.onlyAdminsCanSend } : {}),
        ...(input.slowModeSeconds !== undefined ? { slowModeSeconds: input.slowModeSeconds } : {}),
        ...(input.noForwards !== undefined ? { noForwards: input.noForwards } : {}),
        ...(input.requireAdminApproval !== undefined ? { requireAdminApproval: input.requireAdminApproval } : {}),
        ...(input.membersCanAddMembers !== undefined ? { membersCanAddMembers: input.membersCanAddMembers } : {}),
        ...(input.membersCanPinMessages !== undefined ? { membersCanPinMessages: input.membersCanPinMessages } : {}),
        ...(input.membersCanChangeInfo !== undefined ? { membersCanChangeInfo: input.membersCanChangeInfo } : {}),
        ...(input.membersCanSendMedia !== undefined ? { membersCanSendMedia: input.membersCanSendMedia } : {}),
        ...(input.membersCanSendPolls !== undefined ? { membersCanSendPolls: input.membersCanSendPolls } : {}),
        ...(input.hideHistoryForNewMembers !== undefined
          ? { hideHistoryForNewMembers: input.hideHistoryForNewMembers }
          : {}),
        ...(input.hideMembersList !== undefined ? { hideMembersList: input.hideMembersList } : {}),
        ...(input.reactionsEnabled !== undefined ? { reactionsEnabled: input.reactionsEnabled } : {}),
      },
    });

    const systemMessages: Awaited<ReturnType<typeof createSystemMessage>>[] = [];
    const changedSettingsFields: string[] = [];
    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
    const name = actor?.displayName;

    if (input.title !== undefined && input.title !== conversation.title) {
      changedSettingsFields.push("title");
      systemMessages.push(await createSystemMessage(conversationId, userId, `${name} guruh nomini «${input.title}» ga o'zgartirdi`));
    }
    if (input.avatarUrl !== undefined && input.avatarUrl !== conversation.avatarUrl) {
      changedSettingsFields.push("avatarUrl");
      systemMessages.push(await createSystemMessage(conversationId, userId, `${name} guruh rasmini o'zgartirdi`));
    }
    if (input.description !== undefined && input.description !== conversation.description) {
      changedSettingsFields.push("description");
      systemMessages.push(
        await createSystemMessage(
          conversationId,
          userId,
          input.description ? `${name} guruh tavsifini o'zgartirdi` : `${name} guruh tavsifini o'chirdi`
        )
      );
    }
    if (input.welcomeMessage !== undefined && input.welcomeMessage !== conversation.welcomeMessage) {
      changedSettingsFields.push("welcomeMessage");
      systemMessages.push(
        await createSystemMessage(
          conversationId,
          userId,
          input.welcomeMessage ? `${name} guruh uchun salomlashuv xabarini o'rnatdi` : `${name} guruh salomlashuv xabarini o'chirdi`
        )
      );
    }
    if (input.onlyAdminsCanSend !== undefined && input.onlyAdminsCanSend !== conversation.onlyAdminsCanSend) {
      changedSettingsFields.push("onlyAdminsCanSend");
      systemMessages.push(
        await createSystemMessage(
          conversationId,
          userId,
          input.onlyAdminsCanSend
            ? `${name} faqat adminlar yoza olishini yoqdi`
            : `${name} barcha a'zolar yozishi mumkinligini yoqdi`
        )
      );
    }
    if (input.slowModeSeconds !== undefined && input.slowModeSeconds !== conversation.slowModeSeconds) {
      changedSettingsFields.push("slowModeSeconds");
      systemMessages.push(
        await createSystemMessage(
          conversationId,
          userId,
          input.slowModeSeconds > 0 ? `${name} sekin rejimni yoqdi` : `${name} sekin rejimni o'chirdi`
        )
      );
    }
    if (input.noForwards !== undefined && input.noForwards !== conversation.noForwards) {
      changedSettingsFields.push("noForwards");
      systemMessages.push(
        await createSystemMessage(
          conversationId,
          userId,
          input.noForwards
            ? `${name} nusxalash va yo'naltirishni man qildi`
            : `${name} nusxalash va yo'naltirishga ruxsat berdi`
        )
      );
    }
    if (input.requireAdminApproval !== undefined && input.requireAdminApproval !== conversation.requireAdminApproval) {
      changedSettingsFields.push("requireAdminApproval");
      systemMessages.push(
        await createSystemMessage(
          conversationId,
          userId,
          input.requireAdminApproval
            ? `${name} qo'shilish so'rovlari uchun admin tasdiqlashini yoqdi`
            : `${name} qo'shilish so'rovlari uchun admin tasdiqlashini o'chirdi`
        )
      );
    }
    if (input.membersCanAddMembers !== undefined && input.membersCanAddMembers !== conversation.membersCanAddMembers) {
      changedSettingsFields.push("membersCanAddMembers");
      systemMessages.push(
        await createSystemMessage(
          conversationId,
          userId,
          input.membersCanAddMembers
            ? `${name} a'zolarga yangi a'zo qo'shishga ruxsat berdi`
            : `${name} a'zolarga yangi a'zo qo'shishni man qildi`
        )
      );
    }
    if (
      input.membersCanPinMessages !== undefined &&
      input.membersCanPinMessages !== conversation.membersCanPinMessages
    ) {
      changedSettingsFields.push("membersCanPinMessages");
      systemMessages.push(
        await createSystemMessage(
          conversationId,
          userId,
          input.membersCanPinMessages
            ? `${name} a'zolarga xabarlarni qadashga ruxsat berdi`
            : `${name} a'zolarga xabarlarni qadashni man qildi`
        )
      );
    }
    if (
      input.membersCanChangeInfo !== undefined &&
      input.membersCanChangeInfo !== conversation.membersCanChangeInfo
    ) {
      changedSettingsFields.push("membersCanChangeInfo");
      systemMessages.push(
        await createSystemMessage(
          conversationId,
          userId,
          input.membersCanChangeInfo
            ? `${name} a'zolarga guruh ma'lumotlarini tahrirlashga ruxsat berdi`
            : `${name} a'zolarga guruh ma'lumotlarini tahrirlashni man qildi`
        )
      );
    }
    if (
      input.membersCanSendMedia !== undefined &&
      input.membersCanSendMedia !== conversation.membersCanSendMedia
    ) {
      changedSettingsFields.push("membersCanSendMedia");
      systemMessages.push(
        await createSystemMessage(
          conversationId,
          userId,
          input.membersCanSendMedia
            ? `${name} a'zolarga media yuborishga ruxsat berdi`
            : `${name} a'zolarga faqat matnli xabar yuborishni ruxsat berdi`
        )
      );
    }
    if (
      input.membersCanSendPolls !== undefined &&
      input.membersCanSendPolls !== conversation.membersCanSendPolls
    ) {
      changedSettingsFields.push("membersCanSendPolls");
      systemMessages.push(
        await createSystemMessage(
          conversationId,
          userId,
          input.membersCanSendPolls
            ? `${name} a'zolarga so'rovnoma yaratishga ruxsat berdi`
            : `${name} a'zolarga so'rovnoma yaratishni man qildi`
        )
      );
    }
    if (
      input.hideHistoryForNewMembers !== undefined &&
      input.hideHistoryForNewMembers !== conversation.hideHistoryForNewMembers
    ) {
      changedSettingsFields.push("hideHistoryForNewMembers");
      systemMessages.push(
        await createSystemMessage(
          conversationId,
          userId,
          input.hideHistoryForNewMembers
            ? `${name} yangi a'zolar uchun eski xabarlarni yashirdi`
            : `${name} yangi a'zolar uchun eski xabarlarni ko'rsatishni yoqdi`
        )
      );
    }
    if (input.hideMembersList !== undefined && input.hideMembersList !== conversation.hideMembersList) {
      changedSettingsFields.push("hideMembersList");
      systemMessages.push(
        await createSystemMessage(
          conversationId,
          userId,
          input.hideMembersList
            ? `${name} a'zolar ro'yxatini yashirdi`
            : `${name} a'zolar ro'yxatini ko'rsatishni yoqdi`
        )
      );
    }
    if (input.reactionsEnabled !== undefined && input.reactionsEnabled !== conversation.reactionsEnabled) {
      changedSettingsFields.push("reactionsEnabled");
      systemMessages.push(
        await createSystemMessage(
          conversationId,
          userId,
          input.reactionsEnabled ? `${name} reaksiyalarni yoqdi` : `${name} reaksiyalarni o'chirdi`
        )
      );
    }

    if (changedSettingsFields.length > 0) {
      await chatsService.logGroupAction(
        conversationId,
        userId,
        GroupAuditAction.GROUP_SETTINGS_CHANGED,
        null,
        changedSettingsFields.join(",")
      );
    }

    return { conversation: await chatsService.getConversation(userId, conversationId), systemMessages };
  },

  async removeParticipant(userId: string, conversationId: string, targetUserId: string, ban = false) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });
    if (!conversation) throw Errors.notFound("Suhbat");
    if (conversation.type !== ConversationType.GROUP) {
      throw Errors.badRequest("Faqat guruhdan a'zo chiqarish mumkin");
    }

    const requester = conversation.participants.find((p) => p.userId === userId);
    if (!requester || requester.role === ParticipantRole.MEMBER) throw Errors.forbidden();

    if (targetUserId === userId) {
      throw Errors.badRequest("Guruhdan chiqish uchun 'Guruhdan chiqish' funksiyasidan foydalaning");
    }

    const target = conversation.participants.find((p) => p.userId === targetUserId);
    if (!target) throw Errors.notFound("Foydalanuvchi");
    if (target.role === ParticipantRole.OWNER) throw Errors.forbidden();
    if (target.role === ParticipantRole.ADMIN && requester.role !== ParticipantRole.OWNER) {
      throw Errors.forbidden();
    }

    await prisma.conversationParticipant.delete({ where: { id: target.id } });
    if (ban) {
      await prisma.groupBan.upsert({
        where: { conversationId_bannedUserId: { conversationId, bannedUserId: targetUserId } },
        update: { bannedBy: userId },
        create: { conversationId, bannedUserId: targetUserId, bannedBy: userId },
      });
    }
    await chatsService.logGroupAction(
      conversationId,
      userId,
      ban ? GroupAuditAction.MEMBER_BANNED : GroupAuditAction.MEMBER_REMOVED,
      targetUserId
    );

    const [actor, targetUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } }),
      prisma.user.findUnique({ where: { id: targetUserId }, select: { displayName: true } }),
    ]);
    const systemMessage = await createSystemMessage(
      conversationId,
      userId,
      ban
        ? `${actor?.displayName} ${targetUser?.displayName} foydalanuvchisini guruhdan chiqarib, bloklab qo'ydi`
        : `${actor?.displayName} ${targetUser?.displayName} foydalanuvchisini guruhdan chiqardi`
    );

    await pushService.sendToUsers([targetUserId], {
      title: conversation.title ?? "Guruh",
      body: ban
        ? `${actor?.displayName} sizni guruhdan chiqarib, bloklab qo'ydi`
        : `${actor?.displayName} sizni guruhdan chiqardi`,
      data: { type: "group_removed" },
    });

    return { conversation: await chatsService.getConversation(userId, conversationId), systemMessage };
  },

  /** GROUP only, OWNER/ADMIN only: users removed-and-banned from the group, who can't rejoin or be re-added. */
  async listBannedUsers(userId: string, conversationId: string) {
    await chatsService.assertGroupManager(userId, conversationId);

    const bans = await prisma.groupBan.findMany({
      where: { conversationId },
      orderBy: { createdAt: "desc" },
    });
    const users = await prisma.user.findMany({
      where: { id: { in: bans.map((b) => b.bannedUserId) } },
      select: userSummarySelect,
    });
    const userMap = new Map(users.map((u) => [u.id, u]));
    const [contactIds, exceptions] = await Promise.all([getContactIds(userId), getLastSeenExceptions(userId)]);

    return bans
      .map((b) => {
        const user = userMap.get(b.bannedUserId);
        if (!user) return null;
        return {
          user: omitPrivacyFlags(filterAvatar(userId, filterLastSeen(userId, user, contactIds, exceptions), contactIds)),
          createdAt: b.createdAt,
        };
      })
      .filter((b) => b !== null);
  },

  /** GROUP only, OWNER/ADMIN only: lift a ban, allowing the user to rejoin or be re-added. */
  async unbanUser(userId: string, conversationId: string, targetUserId: string) {
    await chatsService.assertGroupManager(userId, conversationId);

    const ban = await prisma.groupBan.findUnique({
      where: { conversationId_bannedUserId: { conversationId, bannedUserId: targetUserId } },
    });
    if (!ban) throw Errors.notFound("Bloklangan foydalanuvchi");

    await prisma.groupBan.delete({ where: { id: ban.id } });
    await chatsService.logGroupAction(conversationId, userId, GroupAuditAction.MEMBER_UNBANNED, targetUserId);
  },

  /**
   * GROUP only, OWNER/ADMIN only: pre-emptively bans a user who isn't (or no
   * longer is) a member, preventing them from joining via invite link or
   * being re-added by an admin.
   */
  async banUserById(userId: string, conversationId: string, { userId: targetUserId }: BanUserByIdInput) {
    const conversation = await chatsService.assertGroupManager(userId, conversationId);

    if (targetUserId === userId) throw Errors.badRequest("O'zingizni bloklay olmaysiz");
    if (conversation.participants.some((p) => p.userId === targetUserId)) {
      throw Errors.conflict("Foydalanuvchi guruh a'zosi - avval uni guruhdan chiqaring");
    }

    const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: userSummarySelect });
    if (!target) throw Errors.notFound("Foydalanuvchi");

    const existing = await prisma.groupBan.findUnique({
      where: { conversationId_bannedUserId: { conversationId, bannedUserId: targetUserId } },
    });
    if (existing) throw Errors.conflict("Foydalanuvchi allaqachon bloklangan");

    const ban = await prisma.groupBan.create({ data: { conversationId, bannedUserId: targetUserId, bannedBy: userId } });
    await chatsService.logGroupAction(conversationId, userId, GroupAuditAction.MEMBER_BANNED, targetUserId);

    const [contactIds, exceptions] = await Promise.all([getContactIds(userId), getLastSeenExceptions(userId)]);
    return {
      user: omitPrivacyFlags(filterAvatar(userId, filterLastSeen(userId, target, contactIds, exceptions), contactIds)),
      createdAt: ban.createdAt,
    };
  },

  async leaveConversation(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { orderBy: { joinedAt: "asc" } } },
    });
    if (!conversation) throw Errors.notFound("Suhbat");
    if (conversation.type !== ConversationType.GROUP) {
      throw Errors.badRequest("Faqat guruhdan chiqish mumkin");
    }

    const self = conversation.participants.find((p) => p.userId === userId);
    if (!self) throw Errors.forbidden();

    const others = conversation.participants.filter((p) => p.userId !== userId);

    if (others.length === 0) {
      const mediaMessages = await prisma.message.findMany({
        where: { conversationId, mediaUrl: { not: null } },
        select: { mediaUrl: true },
      });

      await prisma.conversation.delete({ where: { id: conversationId } });

      await deleteUploadedFiles(mediaMessages.map((m) => m.mediaUrl));
      return { deleted: true as const, newOwnerId: null as string | null };
    }

    let newOwnerId: string | null = null;
    if (self.role === ParticipantRole.OWNER) {
      const successor = others.find((p) => p.role === ParticipantRole.ADMIN) ?? others[0];
      await prisma.conversationParticipant.update({
        where: { id: successor.id },
        data: { role: ParticipantRole.OWNER },
      });
      newOwnerId = successor.userId;
    }

    await prisma.conversationParticipant.delete({ where: { id: self.id } });

    const leaver = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
    const systemMessage = await createSystemMessage(conversationId, userId, `${leaver?.displayName} guruhdan chiqdi`);
    await chatsService.logGroupAction(conversationId, userId, GroupAuditAction.MEMBER_LEFT);

    if (newOwnerId) {
      await pushService.sendToUsers([newOwnerId], {
        title: conversation.title ?? "Guruh",
        body: "Endi siz ushbu guruhning egasisiz",
        data: { type: "group_role_changed", conversationId },
      });
    }

    return { deleted: false as const, newOwnerId, systemMessage };
  },

  async updateParticipantRole(userId: string, conversationId: string, targetUserId: string, role: ParticipantRole) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });
    if (!conversation) throw Errors.notFound("Suhbat");
    if (conversation.type !== ConversationType.GROUP) {
      throw Errors.badRequest("Faqat guruhda rol o'zgartirish mumkin");
    }

    const requester = conversation.participants.find((p) => p.userId === userId);
    if (!requester || requester.role !== ParticipantRole.OWNER) throw Errors.forbidden();
    if (targetUserId === userId) throw Errors.badRequest("O'z rolingizni o'zgartira olmaysiz");

    const target = conversation.participants.find((p) => p.userId === targetUserId);
    if (!target) throw Errors.notFound("Foydalanuvchi");

    if (role === ParticipantRole.OWNER) {
      await prisma.$transaction([
        prisma.conversationParticipant.update({ where: { id: target.id }, data: { role: ParticipantRole.OWNER } }),
        prisma.conversationParticipant.update({ where: { id: requester.id }, data: { role: ParticipantRole.ADMIN } }),
      ]);
    } else {
      await prisma.conversationParticipant.update({ where: { id: target.id }, data: { role } });
    }
    await chatsService.logGroupAction(conversationId, userId, GroupAuditAction.ROLE_CHANGED, targetUserId, role);

    const [actor, targetUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } }),
      prisma.user.findUnique({ where: { id: targetUserId }, select: { displayName: true } }),
    ]);
    const roleAction =
      role === ParticipantRole.OWNER
        ? "guruh egasi etib tayinladi"
        : role === ParticipantRole.ADMIN
          ? "admin etib tayinladi"
          : "adminlikdan tushirdi";
    const systemMessage = await createSystemMessage(
      conversationId,
      userId,
      `${actor?.displayName} ${targetUser?.displayName} foydalanuvchisini ${roleAction}`
    );

    await pushService.sendToUsers([targetUserId], {
      title: conversation.title ?? "Guruh",
      body:
        role === ParticipantRole.OWNER
          ? `${actor?.displayName} sizni guruh egasi etib tayinladi`
          : role === ParticipantRole.ADMIN
            ? `${actor?.displayName} sizni admin etib tayinladi`
            : `${actor?.displayName} sizni adminlikdan tushirdi`,
      data: { type: "group_role_changed", conversationId },
    });

    return { conversation: await chatsService.getConversation(userId, conversationId), systemMessage };
  },

  async updateParticipantRestriction(
    userId: string,
    conversationId: string,
    targetUserId: string,
    restrictFor: UpdateParticipantRestrictionInput["restrictFor"]
  ) {
    const conversation = await chatsService.assertGroupManager(userId, conversationId);

    const target = conversation.participants.find((p) => p.userId === targetUserId);
    if (!target) throw Errors.notFound("Foydalanuvchi");
    if (target.role !== ParticipantRole.MEMBER) {
      throw Errors.badRequest("Admin va guruh egasini cheklab bo'lmaydi");
    }

    const restrictedUntil =
      restrictFor === "off" ? null : restrictFor === "forever" ? FAR_FUTURE : new Date(Date.now() + RESTRICTION_DURATIONS_MS[restrictFor]);

    await prisma.conversationParticipant.update({
      where: { id: target.id },
      data: { restrictedUntil },
    });
    await chatsService.logGroupAction(
      conversationId,
      userId,
      restrictFor === "off" ? GroupAuditAction.MEMBER_UNRESTRICTED : GroupAuditAction.MEMBER_RESTRICTED,
      targetUserId,
      restrictFor
    );

    return chatsService.getConversation(userId, conversationId);
  },

  async updateParticipantCustomTitle(userId: string, conversationId: string, targetUserId: string, customTitle: string | null) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });
    if (!conversation) throw Errors.notFound("Suhbat");
    if (conversation.type !== ConversationType.GROUP) {
      throw Errors.badRequest("Faqat guruhda unvon belgilash mumkin");
    }

    const requester = conversation.participants.find((p) => p.userId === userId);
    if (!requester || requester.role !== ParticipantRole.OWNER) throw Errors.forbidden();

    const target = conversation.participants.find((p) => p.userId === targetUserId);
    if (!target) throw Errors.notFound("Foydalanuvchi");
    if (target.role === ParticipantRole.MEMBER) {
      throw Errors.badRequest("Faqat admin va guruh egasiga unvon belgilash mumkin");
    }

    await prisma.conversationParticipant.update({
      where: { id: target.id },
      data: { customTitle: customTitle || null },
    });

    return chatsService.getConversation(userId, conversationId);
  },

  // WeChat-style "pat on the shoulder": posts a playful system message naming the actor and target.
  async pat(userId: string, conversationId: string, targetUserId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });
    if (!conversation) throw Errors.notFound("Suhbat");

    const requester = conversation.participants.find((p) => p.userId === userId);
    if (!requester) throw Errors.forbidden();

    const target = conversation.participants.find((p) => p.userId === targetUserId);
    if (!target) throw Errors.notFound("Foydalanuvchi");

    if (conversation.type === ConversationType.DIRECT && userId !== targetUserId) {
      if (await contactsService.isBlockedEitherWay(userId, targetUserId)) throw Errors.blocked();
    }

    const [actor, recipient] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } }),
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          displayName: true,
          quietHoursEnabled: true,
          quietHoursStart: true,
          quietHoursEnd: true,
          quietHoursTimezoneOffset: true,
          notificationsPaused: true,
          notificationsPausedUntil: true,
        },
      }),
    ]);

    const text =
      userId === targetUserId
        ? `${actor?.displayName} o'zini elkasidan qoqib qo'ydi 👋`
        : `${actor?.displayName} ${recipient?.displayName}ni elkasidan qoqib qo'ydi 👋`;

    if (
      userId !== targetUserId &&
      !isParticipantMuted(target) &&
      !target.mutedSenderIds.includes(userId) &&
      recipient &&
      !isInQuietHours(recipient) &&
      !isNotificationsPaused(recipient)
    ) {
      await pushService.sendToUsers([targetUserId], {
        title: actor?.displayName ?? "UzChat",
        body: "sizni elkangizdan qoqib qo'ydi 👋",
        data: { type: "pat", conversationId },
      });
    }

    return createSystemMessage(conversationId, userId, text);
  },
};
