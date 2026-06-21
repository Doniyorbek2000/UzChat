import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { CreateEventInput, UpdateEventInput } from "./events.schema";

const userSelect = { id: true, displayName: true, username: true, avatarUrl: true };

export const eventsService = {
  async listByConversation(conversationId: string) {
    return prisma.event.findMany({
      where: { conversationId },
      include: { creator: { select: userSelect }, rsvps: { include: { user: { select: userSelect } } } },
      orderBy: { startAt: "asc" },
    });
  },

  async getUpcoming(userId: string) {
    const participantConvs = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    const convIds = participantConvs.map((p) => p.conversationId);
    return prisma.event.findMany({
      where: { conversationId: { in: convIds }, startAt: { gte: new Date() } },
      include: { creator: { select: userSelect }, rsvps: { include: { user: { select: userSelect } } }, conversation: { select: { id: true, title: true } } },
      orderBy: { startAt: "asc" },
      take: 50,
    });
  },

  async createEvent(userId: string, conversationId: string, input: CreateEventInput) {
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId, userId },
    });
    if (!participant) throw Errors.forbidden("Siz bu suhbat a'zosi emassiz");

    return prisma.event.create({
      data: {
        conversationId,
        creatorId: userId,
        title: input.title,
        description: input.description,
        location: input.location,
        startAt: new Date(input.startAt),
        endAt: input.endAt ? new Date(input.endAt) : undefined,
        isAllDay: input.isAllDay,
        color: input.color,
        reminderMinutes: input.reminderMinutes,
      },
      include: { creator: { select: userSelect } },
    });
  },

  async updateEvent(userId: string, eventId: string, input: UpdateEventInput) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw Errors.notFound("Tadbir topilmadi");
    if (event.creatorId !== userId) throw Errors.forbidden("Faqat yaratuvchi tadbir o'zgartira oladi");

    return prisma.event.update({
      where: { id: eventId },
      data: {
        ...input,
        startAt: input.startAt ? new Date(input.startAt) : undefined,
        endAt: input.endAt ? new Date(input.endAt) : undefined,
      },
      include: { creator: { select: userSelect } },
    });
  },

  async deleteEvent(userId: string, eventId: string) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw Errors.notFound("Tadbir topilmadi");
    if (event.creatorId !== userId) throw Errors.forbidden("Faqat yaratuvchi tadbirni o'chira oladi");
    await prisma.event.delete({ where: { id: eventId } });
  },

  async rsvp(userId: string, eventId: string, status: string) {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw Errors.notFound("Tadbir topilmadi");

    return prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId, status },
      update: { status, respondedAt: new Date() },
      include: { user: { select: userSelect } },
    });
  },

  async getRsvps(eventId: string) {
    return prisma.eventRsvp.findMany({
      where: { eventId },
      include: { user: { select: userSelect } },
      orderBy: { respondedAt: "desc" },
    });
  },
};
