import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { CreateCommunityInput, UpdateCommunityInput } from "./communities.schema";

export const communitiesService = {
  async listMyCommunities(userId: string) {
    return prisma.community.findMany({
      where: { ownerId: userId },
      include: { groups: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },

  async getCommunity(communityId: string) {
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: { groups: true, owner: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
    });
    if (!community) throw Errors.notFound("Jamoa");
    return community;
  },

  async createCommunity(ownerId: string, input: CreateCommunityInput) {
    return prisma.community.create({
      data: {
        ownerId,
        name: input.name,
        description: input.description,
        avatarUrl: input.avatarUrl,
      },
    });
  },

  async updateCommunity(ownerId: string, communityId: string, input: UpdateCommunityInput) {
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    if (!community || community.ownerId !== ownerId) throw Errors.notFound("Jamoa");

    return prisma.community.update({
      where: { id: communityId },
      data: input,
    });
  },

  async deleteCommunity(ownerId: string, communityId: string) {
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    if (!community || community.ownerId !== ownerId) throw Errors.notFound("Jamoa");

    await prisma.community.delete({ where: { id: communityId } });
  },

  async addGroup(ownerId: string, communityId: string, conversationId: string) {
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    if (!community || community.ownerId !== ownerId) throw Errors.notFound("Jamoa");

    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId: ownerId } },
      select: { role: true },
    });
    if (!participant || !["OWNER", "ADMIN"].includes(participant.role)) {
      throw Errors.forbidden("Siz bu guruhning egasi yoki admini emassiz");
    }

    const existing = await prisma.communityGroup.findUnique({
      where: { communityId_conversationId: { communityId, conversationId } },
    });
    if (existing) throw Errors.conflict("Bu guruh allaqachon qo'shilgan");

    return prisma.communityGroup.create({
      data: { communityId, conversationId },
    });
  },

  async removeGroup(ownerId: string, communityId: string, conversationId: string) {
    const community = await prisma.community.findUnique({ where: { id: communityId } });
    if (!community || community.ownerId !== ownerId) throw Errors.notFound("Jamoa");

    const group = await prisma.communityGroup.findUnique({
      where: { communityId_conversationId: { communityId, conversationId } },
    });
    if (!group) throw Errors.notFound("Guruh");

    await prisma.communityGroup.delete({
      where: { communityId_conversationId: { communityId, conversationId } },
    });
  },
};
