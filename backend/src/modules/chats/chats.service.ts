import { ConversationType, ParticipantRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { AddParticipantInput, CreateConversationInput } from "./chats.schema";

const userSummarySelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  publicKey: true,
  lastSeenAt: true,
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
    const participations = await prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: { include: { user: { select: userSummarySelect } } },
            messages: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        },
      },
      orderBy: { conversation: { updatedAt: "desc" } },
    });

    return participations.map((p) => ({
      id: p.conversation.id,
      type: p.conversation.type,
      title: p.conversation.title,
      avatarUrl: p.conversation.avatarUrl,
      updatedAt: p.conversation.updatedAt,
      wrappedKey: p.wrappedKey,
      wrappedKeyNonce: p.wrappedKeyNonce,
      keySenderPublicKey: p.keySenderPublicKey,
      lastReadAt: p.lastReadAt,
      participants: p.conversation.participants.map((cp) => ({
        userId: cp.userId,
        role: cp.role,
        user: cp.user,
      })),
      lastMessage: p.conversation.messages[0] ?? null,
    }));
  },

  async getConversation(userId: string, conversationId: string) {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
      include: {
        conversation: {
          include: { participants: { include: { user: { select: userSummarySelect } } } },
        },
      },
    });
    if (!participant) throw Errors.notFound("Suhbat");

    return {
      id: participant.conversation.id,
      type: participant.conversation.type,
      title: participant.conversation.title,
      avatarUrl: participant.conversation.avatarUrl,
      updatedAt: participant.conversation.updatedAt,
      wrappedKey: participant.wrappedKey,
      wrappedKeyNonce: participant.wrappedKeyNonce,
      keySenderPublicKey: participant.keySenderPublicKey,
      lastReadAt: participant.lastReadAt,
      participants: participant.conversation.participants.map((cp) => ({
        userId: cp.userId,
        role: cp.role,
        user: cp.user,
      })),
    };
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
};
