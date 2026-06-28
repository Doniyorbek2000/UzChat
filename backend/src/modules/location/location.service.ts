import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { ShareLocationInput, UpdateLocationInput } from "./location.schema";

const userSelect = { id: true, displayName: true, username: true, avatarUrl: true };

export const locationService = {
  async shareLocation(userId: string, input: ShareLocationInput) {
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId: input.conversationId, userId },
    });
    if (!participant) throw Errors.forbidden("Siz bu suhbat a'zosi emassiz");

    const expiresAt = input.isLive && input.durationMinutes
      ? new Date(Date.now() + input.durationMinutes * 60000)
      : undefined;

    return prisma.locationShare.create({
      data: {
        userId,
        conversationId: input.conversationId,
        latitude: input.latitude,
        longitude: input.longitude,
        isLive: input.isLive ?? false,
        expiresAt,
      },
      include: { user: { select: userSelect } },
    });
  },

  async updateLiveLocation(userId: string, shareId: string, input: UpdateLocationInput) {
    const share = await prisma.locationShare.findUnique({ where: { id: shareId } });
    if (!share || share.userId !== userId) throw Errors.notFound("Joylashuv topilmadi");
    if (!share.isLive) throw Errors.badRequest("Bu jonli joylashuv emas");

    return prisma.locationShare.update({
      where: { id: shareId },
      data: { latitude: input.latitude, longitude: input.longitude },
    });
  },

  async stopLiveLocation(userId: string, shareId: string) {
    const share = await prisma.locationShare.findUnique({ where: { id: shareId } });
    if (!share || share.userId !== userId) throw Errors.notFound("Joylashuv topilmadi");

    return prisma.locationShare.update({
      where: { id: shareId },
      data: { isLive: false, expiresAt: new Date() },
    });
  },

  async getConversationLocations(conversationId: string) {
    return prisma.locationShare.findMany({
      where: {
        conversationId,
        OR: [
          { isLive: true, expiresAt: { gt: new Date() } },
          { isLive: false },
        ],
      },
      include: { user: { select: userSelect } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },

  async getMyLiveLocations(userId: string) {
    return prisma.locationShare.findMany({
      where: { userId, isLive: true, expiresAt: { gt: new Date() } },
      include: { conversation: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  },
};
