import crypto from "crypto";
import { ConversationType, GroupAddPrivacy, MessagePrivacy, ParticipantRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { getContactIds, filterLastSeen, filterAvatar } from "../../utils/lastSeen";
import { contactsService } from "../contacts/contacts.service";
import { createSystemMessage } from "../messages/systemMessages";
import { pushService } from "../push/push.service";
import {
  AddParticipantInput,
  CreateConversationInput,
  CreateInviteLinkInput,
  JoinByInviteInput,
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

const MUTE_DURATIONS_MS: Record<"1h" | "8h" | "1d" | "1w", number> = {
  "1h": 60 * 60 * 1000,
  "8h": 8 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
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
function visibleLastReadAt(
  viewerId: string,
  viewerReadReceiptsEnabled: boolean,
  participant: { userId: string; lastReadAt: Date | null; user: { readReceiptsEnabled: boolean } }
): Date | null {
  if (participant.userId === viewerId) return participant.lastReadAt;
  return viewerReadReceiptsEnabled && participant.user.readReceiptsEnabled ? participant.lastReadAt : null;
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

    const conversation = await prisma.conversation.create({
      data: {
        type: input.type === "GROUP" ? ConversationType.GROUP : ConversationType.DIRECT,
        title: input.title,
        isSelf: input.type === "DIRECT" && input.participants.length === 1,
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
    const [participations, blocked, contactIds, viewer] = await Promise.all([
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
        orderBy: [{ pinnedAt: { sort: "desc", nulls: "last" } }, { conversation: { updatedAt: "desc" } }],
      }),
      prisma.blockedUser.findMany({ where: { ownerId: userId }, select: { blockedId: true } }),
      getContactIds(userId),
      prisma.user.findUnique({ where: { id: userId }, select: { readReceiptsEnabled: true } }),
    ]);
    const viewerReadReceiptsEnabled = viewer?.readReceiptsEnabled ?? true;

    const blockedIds = new Set(blocked.map((b) => b.blockedId));

    return participations.map((p) => {
      const other = p.conversation.participants.find((cp) => cp.userId !== userId);
      return {
        id: p.conversation.id,
        type: p.conversation.type,
        title: p.conversation.title,
        description: p.conversation.description,
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
        isSelf: p.conversation.isSelf,
        pinnedMessages: p.conversation.pinnedMessages.map((pm) => ({ ...pm.message, pinnedAt: pm.pinnedAt })),
        participants: p.conversation.participants.map((cp) => ({
          userId: cp.userId,
          role: cp.role,
          user: omitPrivacyFlags(filterAvatar(userId, filterLastSeen(userId, cp.user, contactIds), contactIds)),
          lastReadAt: visibleLastReadAt(userId, viewerReadReceiptsEnabled, cp),
          restrictedUntil: cp.restrictedUntil,
        })),
        lastMessage:
          p.clearedAt && p.conversation.messages[0] && p.conversation.messages[0].createdAt <= p.clearedAt
            ? null
            : p.conversation.messages[0] ?? null,
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

    const [contactIds, viewer] = await Promise.all([
      getContactIds(userId),
      prisma.user.findUnique({ where: { id: userId }, select: { readReceiptsEnabled: true } }),
    ]);
    const viewerReadReceiptsEnabled = viewer?.readReceiptsEnabled ?? true;

    return {
      id: participant.conversation.id,
      type: participant.conversation.type,
      title: participant.conversation.title,
      description: participant.conversation.description,
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
      isSelf: participant.conversation.isSelf,
      pinnedMessages: participant.conversation.pinnedMessages.map((pm) => ({ ...pm.message, pinnedAt: pm.pinnedAt })),
      participants: participant.conversation.participants.map((cp) => ({
        userId: cp.userId,
        role: cp.role,
        user: omitPrivacyFlags(filterAvatar(userId, filterLastSeen(userId, cp.user, contactIds), contactIds)),
        lastReadAt: visibleLastReadAt(userId, viewerReadReceiptsEnabled, cp),
        restrictedUntil: cp.restrictedUntil,
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

    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: {
        ...(input.isPinned !== undefined ? { pinnedAt: input.isPinned ? new Date() : null } : {}),
        ...muteData,
        ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
        ...(input.markedUnread !== undefined ? { markedUnread: input.markedUnread } : {}),
      },
    });

    return chatsService.getConversation(userId, conversationId);
  },

  async clearHistory(userId: string, conversationId: string) {
    const participant = await chatsService.assertParticipant(userId, conversationId);

    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: { clearedAt: new Date() },
    });
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

  async pinMessage(userId: string, conversationId: string, messageId: string) {
    await chatsService.assertCanManagePins(userId, conversationId);

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversationId) throw Errors.notFound("Xabar");
    if (message.deletedAt) throw Errors.badRequest("O'chirilgan xabarni qadab bo'lmaydi");

    const alreadyPinned = await prisma.pinnedMessage.findUnique({
      where: { conversationId_messageId: { conversationId, messageId } },
    });

    await prisma.pinnedMessage.upsert({
      where: { conversationId_messageId: { conversationId, messageId } },
      create: { conversationId, messageId, pinnedBy: userId },
      update: {},
    });

    let systemMessage = null;
    if (!alreadyPinned) {
      const actor = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
      systemMessage = await createSystemMessage(conversationId, userId, `${actor?.displayName} xabarni qadab qo'ydi`);
    }

    return { conversation: await chatsService.getConversation(userId, conversationId), systemMessage };
  },

  async unpinMessage(userId: string, conversationId: string, messageId: string) {
    await chatsService.assertCanManagePins(userId, conversationId);

    await prisma.pinnedMessage.deleteMany({ where: { conversationId, messageId } });

    return chatsService.getConversation(userId, conversationId);
  },

  async unpinAllMessages(userId: string, conversationId: string) {
    await chatsService.assertCanManagePins(userId, conversationId);

    await prisma.pinnedMessage.deleteMany({ where: { conversationId } });

    return chatsService.getConversation(userId, conversationId);
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

    await prisma.conversation.update({ where: { id: conversationId }, data: { disappearingSeconds } });

    return chatsService.getConversation(userId, conversationId);
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
        return { inviteCode, inviteCodeExpiresAt: expiresAt, inviteCodeMaxUses: maxUses, inviteCodeUseCount: 0 };
      } catch (err: any) {
        if (err?.code !== "P2002") throw err;
      }
    }
    throw Errors.badRequest("Taklif havolasini yaratib bo'lmadi");
  },

  async revokeInviteLink(userId: string, conversationId: string) {
    await chatsService.assertGroupManager(userId, conversationId);
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { inviteCode: null, inviteCodeExpiresAt: null, inviteCodeMaxUses: null, inviteCodeUseCount: 0 },
    });
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
        systemMessage: null,
      };
    }

    if (!isInviteLinkUsable(conversation)) throw Errors.notFound("Taklif havolasi");

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

    const joiner = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
    const systemMessage = await createSystemMessage(conversation.id, userId, `${joiner?.displayName} guruhga qo'shildi`);

    return {
      pending: false as const,
      conversation: await chatsService.getConversation(userId, conversation.id),
      alreadyMember: false,
      systemMessage,
    };
  },

  async listJoinRequests(userId: string, conversationId: string) {
    await chatsService.assertGroupManager(userId, conversationId);

    const requests = await prisma.groupJoinRequest.findMany({
      where: { conversationId },
      include: { user: { select: userSummarySelect } },
      orderBy: { createdAt: "desc" },
    });
    const contactIds = await getContactIds(userId);
    return requests.map((r) => ({
      id: r.id,
      user: omitPrivacyFlags(filterAvatar(userId, filterLastSeen(userId, r.user, contactIds), contactIds)),
      createdAt: r.createdAt,
    }));
  },

  async approveJoinRequest(userId: string, conversationId: string, requestId: string) {
    await chatsService.assertGroupManager(userId, conversationId);

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
    const systemMessage = await createSystemMessage(conversationId, request.userId, `${joiner?.displayName} guruhga qo'shildi`);

    return {
      conversation: await chatsService.getConversation(userId, conversationId),
      systemMessage,
      newParticipantId: request.userId,
    };
  },

  async declineJoinRequest(userId: string, conversationId: string, requestId: string) {
    await chatsService.assertGroupManager(userId, conversationId);

    const request = await prisma.groupJoinRequest.findUnique({ where: { id: requestId } });
    if (!request || request.conversationId !== conversationId) throw Errors.notFound("So'rov");

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
    const systemMessage = await createSystemMessage(
      conversationId,
      userId,
      `${actor?.displayName} ${target.displayName} foydalanuvchisini guruhga qo'shdi`
    );

    return { conversation: await chatsService.getConversation(userId, conversationId), systemMessage };
  },

  async assertParticipant(userId: string, conversationId: string) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw Errors.forbidden();
    return participant;
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
        ...(input.onlyAdminsCanSend !== undefined ? { onlyAdminsCanSend: input.onlyAdminsCanSend } : {}),
        ...(input.slowModeSeconds !== undefined ? { slowModeSeconds: input.slowModeSeconds } : {}),
        ...(input.noForwards !== undefined ? { noForwards: input.noForwards } : {}),
        ...(input.requireAdminApproval !== undefined ? { requireAdminApproval: input.requireAdminApproval } : {}),
        ...(input.membersCanAddMembers !== undefined ? { membersCanAddMembers: input.membersCanAddMembers } : {}),
        ...(input.membersCanPinMessages !== undefined ? { membersCanPinMessages: input.membersCanPinMessages } : {}),
        ...(input.membersCanChangeInfo !== undefined ? { membersCanChangeInfo: input.membersCanChangeInfo } : {}),
        ...(input.membersCanSendMedia !== undefined ? { membersCanSendMedia: input.membersCanSendMedia } : {}),
      },
    });

    const systemMessages: Awaited<ReturnType<typeof createSystemMessage>>[] = [];
    const actor = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
    const name = actor?.displayName;

    if (input.title !== undefined && input.title !== conversation.title) {
      systemMessages.push(await createSystemMessage(conversationId, userId, `${name} guruh nomini «${input.title}» ga o'zgartirdi`));
    }
    if (input.avatarUrl !== undefined && input.avatarUrl !== conversation.avatarUrl) {
      systemMessages.push(await createSystemMessage(conversationId, userId, `${name} guruh rasmini o'zgartirdi`));
    }
    if (input.description !== undefined && input.description !== conversation.description) {
      systemMessages.push(
        await createSystemMessage(
          conversationId,
          userId,
          input.description ? `${name} guruh tavsifini o'zgartirdi` : `${name} guruh tavsifini o'chirdi`
        )
      );
    }
    if (input.onlyAdminsCanSend !== undefined && input.onlyAdminsCanSend !== conversation.onlyAdminsCanSend) {
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
      systemMessages.push(
        await createSystemMessage(
          conversationId,
          userId,
          input.slowModeSeconds > 0 ? `${name} sekin rejimni yoqdi` : `${name} sekin rejimni o'chirdi`
        )
      );
    }
    if (input.noForwards !== undefined && input.noForwards !== conversation.noForwards) {
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

    return { conversation: await chatsService.getConversation(userId, conversationId), systemMessages };
  },

  async removeParticipant(userId: string, conversationId: string, targetUserId: string) {
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

    const [actor, targetUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } }),
      prisma.user.findUnique({ where: { id: targetUserId }, select: { displayName: true } }),
    ]);
    const systemMessage = await createSystemMessage(
      conversationId,
      userId,
      `${actor?.displayName} ${targetUser?.displayName} foydalanuvchisini guruhdan chiqardi`
    );

    return { conversation: await chatsService.getConversation(userId, conversationId), systemMessage };
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
      await prisma.conversation.delete({ where: { id: conversationId } });
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

    return chatsService.getConversation(userId, conversationId);
  },
};
