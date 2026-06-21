import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { CreateVoiceRoomInput } from "./voicerooms.schema";

const userSelect = {
  id: true,
  displayName: true,
  username: true,
  avatarUrl: true,
} as const;

export const voiceRoomsService = {
  async createRoom(hostId: string, input: CreateVoiceRoomInput) {
    return prisma.voiceRoom.create({
      data: {
        title: input.title,
        hostId,
        conversationId: input.conversationId ?? null,
        scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
        maxSpeakers: input.maxSpeakers ?? 10,
        status: input.scheduledFor ? "SCHEDULED" : "LIVE",
        startedAt: input.scheduledFor ? null : new Date(),
      },
      include: { host: { select: userSelect } },
    });
  },

  async listLive() {
    return prisma.voiceRoom.findMany({
      where: { status: "LIVE" },
      include: {
        host: { select: userSelect },
        _count: { select: { participants: true } },
      },
      orderBy: { startedAt: "desc" },
    });
  },

  async listScheduled() {
    return prisma.voiceRoom.findMany({
      where: {
        status: "SCHEDULED",
        scheduledFor: { gte: new Date() },
      },
      include: {
        host: { select: userSelect },
        _count: { select: { participants: true } },
      },
      orderBy: { scheduledFor: "asc" },
    });
  },

  async getRoom(roomId: string) {
    const room = await prisma.voiceRoom.findUnique({
      where: { id: roomId },
      include: {
        host: { select: userSelect },
        participants: {
          where: { leftAt: null },
          include: { user: { select: userSelect } },
          orderBy: { joinedAt: "asc" },
        },
      },
    });
    if (!room) throw Errors.notFound("Ovozli xona");
    return room;
  },

  async startRoom(hostId: string, roomId: string) {
    const room = await prisma.voiceRoom.findUnique({ where: { id: roomId } });
    if (!room) throw Errors.notFound("Ovozli xona");
    if (room.hostId !== hostId) throw Errors.forbidden("Faqat xona egasi boshlashi mumkin");
    if (room.status !== "SCHEDULED") throw Errors.badRequest("Faqat rejalashtirilgan xonani boshlash mumkin");

    return prisma.voiceRoom.update({
      where: { id: roomId },
      data: { status: "LIVE", startedAt: new Date() },
      include: { host: { select: userSelect } },
    });
  },

  async endRoom(hostId: string, roomId: string) {
    const room = await prisma.voiceRoom.findUnique({ where: { id: roomId } });
    if (!room) throw Errors.notFound("Ovozli xona");
    if (room.hostId !== hostId) throw Errors.forbidden("Faqat xona egasi tugatishi mumkin");
    if (room.status === "ENDED") throw Errors.badRequest("Xona allaqachon tugatilgan");

    return prisma.voiceRoom.update({
      where: { id: roomId },
      data: { status: "ENDED", endedAt: new Date() },
      include: { host: { select: userSelect } },
    });
  },

  async joinRoom(userId: string, roomId: string) {
    const room = await prisma.voiceRoom.findUnique({ where: { id: roomId } });
    if (!room) throw Errors.notFound("Ovozli xona");
    if (room.status !== "LIVE") throw Errors.badRequest("Xona hozirda jonli emas");

    const existing = await prisma.voiceRoomParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (existing && !existing.leftAt) {
      throw Errors.conflict("Siz allaqachon xonadasiz");
    }

    if (existing) {
      return prisma.voiceRoomParticipant.update({
        where: { id: existing.id },
        data: { leftAt: null, joinedAt: new Date(), role: "listener", isMuted: true },
        include: { user: { select: userSelect } },
      });
    }

    return prisma.voiceRoomParticipant.create({
      data: { roomId, userId, role: "listener", isMuted: true },
      include: { user: { select: userSelect } },
    });
  },

  async leaveRoom(userId: string, roomId: string) {
    const participant = await prisma.voiceRoomParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!participant || participant.leftAt) throw Errors.notFound("Ishtirokchi");

    return prisma.voiceRoomParticipant.update({
      where: { id: participant.id },
      data: { leftAt: new Date() },
      include: { user: { select: userSelect } },
    });
  },

  async promoteToSpeaker(hostId: string, roomId: string, userId: string) {
    const room = await prisma.voiceRoom.findUnique({ where: { id: roomId } });
    if (!room) throw Errors.notFound("Ovozli xona");
    if (room.hostId !== hostId) throw Errors.forbidden("Faqat xona egasi ko'tarishi mumkin");
    if (room.status !== "LIVE") throw Errors.badRequest("Xona jonli emas");

    const speakerCount = await prisma.voiceRoomParticipant.count({
      where: { roomId, role: "speaker", leftAt: null },
    });
    if (speakerCount >= room.maxSpeakers) {
      throw Errors.badRequest("So'zlovchilar soni chegarasiga yetdi");
    }

    const participant = await prisma.voiceRoomParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!participant || participant.leftAt) throw Errors.notFound("Ishtirokchi");

    return prisma.voiceRoomParticipant.update({
      where: { id: participant.id },
      data: { role: "speaker" },
      include: { user: { select: userSelect } },
    });
  },

  async demoteToListener(hostId: string, roomId: string, userId: string) {
    const room = await prisma.voiceRoom.findUnique({ where: { id: roomId } });
    if (!room) throw Errors.notFound("Ovozli xona");
    if (room.hostId !== hostId) throw Errors.forbidden("Faqat xona egasi tushirishi mumkin");

    const participant = await prisma.voiceRoomParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!participant || participant.leftAt) throw Errors.notFound("Ishtirokchi");

    return prisma.voiceRoomParticipant.update({
      where: { id: participant.id },
      data: { role: "listener", isMuted: true },
      include: { user: { select: userSelect } },
    });
  },

  async toggleMute(userId: string, roomId: string) {
    const participant = await prisma.voiceRoomParticipant.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!participant || participant.leftAt) throw Errors.notFound("Ishtirokchi");

    return prisma.voiceRoomParticipant.update({
      where: { id: participant.id },
      data: { isMuted: !participant.isMuted },
      include: { user: { select: userSelect } },
    });
  },
};
