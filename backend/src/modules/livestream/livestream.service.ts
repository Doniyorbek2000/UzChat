import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { CreateLiveStreamInput } from "./livestream.schema";

export const liveStreamService = {
  async createStream(hostId: string, input: CreateLiveStreamInput) {
    return prisma.liveStream.create({
      data: {
        hostId,
        title: input.title,
        description: input.description,
        thumbnailUrl: input.thumbnailUrl,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : undefined,
      },
    });
  },

  async listLive() {
    return prisma.liveStream.findMany({
      where: { status: "LIVE" },
      include: { host: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
      orderBy: { startedAt: "desc" },
      take: 50,
    });
  },

  async listScheduled() {
    return prisma.liveStream.findMany({
      where: { status: "SCHEDULED" },
      include: { host: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
      orderBy: { scheduledFor: "asc" },
      take: 50,
    });
  },

  async getStream(streamId: string) {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
      include: { host: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
    });
    if (!stream) throw Errors.notFound("Efir");
    return stream;
  },

  async startStream(hostId: string, streamId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.hostId !== hostId) throw Errors.notFound("Efir");
    if (stream.status === "LIVE") throw Errors.badRequest("Efir allaqachon boshlangan");
    if (stream.status === "ENDED") throw Errors.badRequest("Efir allaqachon tugagan");

    return prisma.liveStream.update({
      where: { id: streamId },
      data: { status: "LIVE", startedAt: new Date() },
    });
  },

  async endStream(hostId: string, streamId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream || stream.hostId !== hostId) throw Errors.notFound("Efir");
    if (stream.status === "ENDED") throw Errors.badRequest("Efir allaqachon tugagan");

    return prisma.liveStream.update({
      where: { id: streamId },
      data: { status: "ENDED", endedAt: new Date() },
    });
  },

  async recordView(streamId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw Errors.notFound("Efir");

    const newViewerCount = stream.viewerCount + 1;
    await prisma.liveStream.update({
      where: { id: streamId },
      data: {
        viewerCount: newViewerCount,
        peakViewers: newViewerCount > stream.peakViewers ? newViewerCount : stream.peakViewers,
      },
    });
  },

  async toggleLike(streamId: string) {
    const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
    if (!stream) throw Errors.notFound("Efir");

    await prisma.liveStream.update({
      where: { id: streamId },
      data: { likeCount: { increment: 1 } },
    });
  },
};
