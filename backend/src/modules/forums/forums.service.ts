import { ParticipantRole } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { CreateTopicInput, UpdateTopicInput } from "./forums.schema";

export const forumsService = {
  async listTopics(conversationId: string) {
    return prisma.forumTopic.findMany({
      where: { conversationId },
      orderBy: [{ isPinned: "desc" }, { lastMessageAt: "desc" }],
      include: {
        creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
  },

  async createTopic(userId: string, conversationId: string, input: CreateTopicInput) {
    await this.assertForumParticipant(userId, conversationId);

    return prisma.forumTopic.create({
      data: {
        conversationId,
        creatorId: userId,
        title: input.title,
        iconEmoji: input.iconEmoji,
        iconColor: input.iconColor,
      },
      include: {
        creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
  },

  async updateTopic(userId: string, conversationId: string, topicId: string, input: UpdateTopicInput) {
    const participant = await this.assertForumParticipant(userId, conversationId);

    const topic = await prisma.forumTopic.findUnique({ where: { id: topicId } });
    if (!topic || topic.conversationId !== conversationId) throw Errors.notFound("Mavzu");

    const isAdminOrOwner = participant.role === ParticipantRole.OWNER || participant.role === ParticipantRole.ADMIN;
    if (!isAdminOrOwner && topic.creatorId !== userId) {
      throw Errors.forbidden("Faqat admin yoki mavzu yaratuvchisi o'zgartira oladi");
    }

    return prisma.forumTopic.update({
      where: { id: topicId },
      data: input,
      include: {
        creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
  },

  async deleteTopic(userId: string, conversationId: string, topicId: string) {
    const participant = await this.assertForumParticipant(userId, conversationId);

    const topic = await prisma.forumTopic.findUnique({ where: { id: topicId } });
    if (!topic || topic.conversationId !== conversationId) throw Errors.notFound("Mavzu");

    const isAdminOrOwner = participant.role === ParticipantRole.OWNER || participant.role === ParticipantRole.ADMIN;
    if (!isAdminOrOwner) {
      throw Errors.forbidden("Faqat admin mavzuni o'chira oladi");
    }

    await prisma.forumTopic.delete({ where: { id: topicId } });
  },

  async getTopic(topicId: string) {
    const topic = await prisma.forumTopic.findUnique({
      where: { id: topicId },
      include: {
        creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });
    if (!topic) throw Errors.notFound("Mavzu");
    return topic;
  },

  async assertForumParticipant(userId: string, conversationId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });
    if (!conversation) throw Errors.notFound("Suhbat");
    if (!conversation.isForumEnabled) {
      throw Errors.badRequest("Bu suhbatda forum yoqilmagan");
    }

    const participant = conversation.participants.find((p) => p.userId === userId);
    if (!participant) throw Errors.forbidden("Siz bu suhbat a'zosi emassiz");
    return participant;
  },
};
