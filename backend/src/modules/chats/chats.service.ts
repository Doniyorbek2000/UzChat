import crypto from "crypto";
import { ConversationType, ParticipantRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { contactsService } from "../contacts/contacts.service";
import {
  AddParticipantInput,
  CreateConversationInput,
  JoinByInviteInput,
  UpdateConversationInput,
  UpdatePreferencesInput,
} from "./chats.schema";

const userSummarySelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  publicKey: true,
  lastSeenAt: true,
} as const;

const pinnedMessageSelect = {
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

    if (input.type === "DIRECT") {
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
    }

    const conversation = await prisma.conversation.create({
      data: {
        type: input.type === "GROUP" ? ConversationType.GROUP : ConversationType.DIRECT,
        title: input.title,
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
    const [participations, blocked] = await Promise.all([
      prisma.conversationParticipant.findMany({
        where: { userId },
        include: {
          conversation: {
            include: {
              participants: { include: { user: { select: userSummarySelect } } },
              messages: { orderBy: { createdAt: "desc" }, take: 1 },
              pinnedMessage: pinnedMessageSelect,
            },
          },
        },
        orderBy: [{ pinnedAt: { sort: "desc", nulls: "last" } }, { conversation: { updatedAt: "desc" } }],
      }),
      prisma.blockedUser.findMany({ where: { ownerId: userId }, select: { blockedId: true } }),
    ]);

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
        isMuted: p.isMuted,
        isArchived: p.isArchived,
        markedUnread: p.markedUnread,
        isBlocked: p.conversation.type === ConversationType.DIRECT && !!other && blockedIds.has(other.userId),
        inviteCode: p.role === ParticipantRole.MEMBER ? null : p.conversation.inviteCode,
        pinnedMessage: p.conversation.pinnedMessage,
        participants: p.conversation.participants.map((cp) => ({
          userId: cp.userId,
          role: cp.role,
          user: cp.user,
          lastReadAt: cp.lastReadAt,
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
            pinnedMessage: pinnedMessageSelect,
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
      isMuted: participant.isMuted,
      isArchived: participant.isArchived,
      markedUnread: participant.markedUnread,
      isBlocked,
      inviteCode: participant.role === ParticipantRole.MEMBER ? null : participant.conversation.inviteCode,
      pinnedMessage: participant.conversation.pinnedMessage,
      participants: participant.conversation.participants.map((cp) => ({
        userId: cp.userId,
        role: cp.role,
        user: cp.user,
        lastReadAt: cp.lastReadAt,
      })),
    };
  },

  async updatePreferences(userId: string, conversationId: string, input: UpdatePreferencesInput) {
    const participant = await chatsService.assertParticipant(userId, conversationId);

    await prisma.conversationParticipant.update({
      where: { id: participant.id },
      data: {
        ...(input.isPinned !== undefined ? { pinnedAt: input.isPinned ? new Date() : null } : {}),
        ...(input.isMuted !== undefined ? { isMuted: input.isMuted } : {}),
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

  async setPinnedMessage(userId: string, conversationId: string, messageId: string | null) {
    await chatsService.assertParticipant(userId, conversationId);

    if (messageId) {
      const message = await prisma.message.findUnique({ where: { id: messageId } });
      if (!message || message.conversationId !== conversationId) throw Errors.notFound("Xabar");
      if (message.deletedAt) throw Errors.badRequest("O'chirilgan xabarni qadab bo'lmaydi");
    }

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { pinnedMessageId: messageId },
    });

    return chatsService.getConversation(userId, conversationId);
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

  async createInviteLink(userId: string, conversationId: string) {
    await chatsService.assertGroupManager(userId, conversationId);

    for (let attempt = 0; attempt < 5; attempt++) {
      const inviteCode = crypto.randomBytes(6).toString("base64url");
      try {
        await prisma.conversation.update({ where: { id: conversationId }, data: { inviteCode } });
        return { inviteCode };
      } catch (err: any) {
        if (err?.code !== "P2002") throw err;
      }
    }
    throw Errors.badRequest("Taklif havolasini yaratib bo'lmadi");
  },

  async revokeInviteLink(userId: string, conversationId: string) {
    await chatsService.assertGroupManager(userId, conversationId);
    await prisma.conversation.update({ where: { id: conversationId }, data: { inviteCode: null } });
  },

  async getInvitePreview(code: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { inviteCode: code },
      include: { participants: true },
    });
    if (!conversation) throw Errors.notFound("Taklif havolasi");

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
    if (!alreadyMember) {
      await prisma.conversationParticipant.create({
        data: {
          conversationId: conversation.id,
          userId,
          role: ParticipantRole.MEMBER,
          wrappedKey: input.wrappedKey,
          wrappedKeyNonce: input.wrappedKeyNonce,
          keySenderPublicKey: input.keySenderPublicKey,
        },
      });
    }

    return { conversation: await chatsService.getConversation(userId, conversation.id), alreadyMember };
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
    if (!requester || (requester.role !== ParticipantRole.OWNER && requester.role !== ParticipantRole.ADMIN)) {
      throw Errors.forbidden();
    }

    if (conversation.participants.some((p) => p.userId === input.userId)) {
      throw Errors.conflict("Foydalanuvchi allaqachon guruh a'zosi");
    }

    const target = await prisma.user.findUnique({ where: { id: input.userId } });
    if (!target) throw Errors.notFound("Foydalanuvchi");

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

    return chatsService.getConversation(userId, conversationId);
  },

  async assertParticipant(userId: string, conversationId: string) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!participant) throw Errors.forbidden();
    return participant;
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
    if (!requester || requester.role === ParticipantRole.MEMBER) throw Errors.forbidden();

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });

    return chatsService.getConversation(userId, conversationId);
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

    return chatsService.getConversation(userId, conversationId);
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

    return { deleted: false as const, newOwnerId };
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

    return chatsService.getConversation(userId, conversationId);
  },
};
