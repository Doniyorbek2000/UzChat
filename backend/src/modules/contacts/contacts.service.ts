import { ContactStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";

const userSummarySelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  publicKey: true,
  lastSeenAt: true,
} as const;

export const contactsService = {
  async sendRequest(ownerId: string, username: string) {
    const target = await prisma.user.findUnique({ where: { username } });
    if (!target) throw Errors.notFound("Foydalanuvchi");
    if (target.id === ownerId) throw Errors.badRequest("O'zingizni qo'sha olmaysiz");

    if (await contactsService.isBlockedEitherWay(ownerId, target.id)) {
      throw Errors.blocked();
    }

    const existing = await prisma.contact.findUnique({
      where: { ownerId_targetId: { ownerId, targetId: target.id } },
    });
    if (existing) throw Errors.conflict("So'rov allaqachon yuborilgan yoki u sizning kontaktingiz");

    const contact = await prisma.contact.create({
      data: { ownerId, targetId: target.id, status: ContactStatus.PENDING },
      include: { target: { select: userSummarySelect } },
    });
    return contact;
  },

  async listIncomingRequests(userId: string) {
    const requests = await prisma.contact.findMany({
      where: { targetId: userId, status: ContactStatus.PENDING },
      include: { owner: { select: userSummarySelect } },
      orderBy: { createdAt: "desc" },
    });
    return requests;
  },

  async acceptRequest(userId: string, requestId: string) {
    const request = await prisma.contact.findUnique({ where: { id: requestId } });
    if (!request || request.targetId !== userId || request.status !== ContactStatus.PENDING) {
      throw Errors.notFound("So'rov");
    }

    await prisma.$transaction([
      prisma.contact.update({ where: { id: requestId }, data: { status: ContactStatus.ACCEPTED } }),
      prisma.contact.upsert({
        where: { ownerId_targetId: { ownerId: userId, targetId: request.ownerId } },
        update: { status: ContactStatus.ACCEPTED },
        create: { ownerId: userId, targetId: request.ownerId, status: ContactStatus.ACCEPTED },
      }),
    ]);
  },

  async declineRequest(userId: string, requestId: string) {
    const request = await prisma.contact.findUnique({ where: { id: requestId } });
    if (!request || request.targetId !== userId || request.status !== ContactStatus.PENDING) {
      throw Errors.notFound("So'rov");
    }
    await prisma.contact.delete({ where: { id: requestId } });
  },

  async listContacts(userId: string) {
    const contacts = await prisma.contact.findMany({
      where: { ownerId: userId, status: ContactStatus.ACCEPTED },
      include: { target: { select: userSummarySelect } },
      orderBy: { target: { displayName: "asc" } },
    });
    return contacts.map((c) => ({ id: c.id, alias: c.alias, user: c.target }));
  },

  async removeContact(userId: string, contactId: string) {
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.ownerId !== userId) throw Errors.notFound("Kontakt");
    await prisma.contact.delete({ where: { id: contactId } });
  },

  async blockUser(ownerId: string, targetUserId: string) {
    if (targetUserId === ownerId) throw Errors.badRequest("O'zingizni bloklay olmaysiz");
    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) throw Errors.notFound("Foydalanuvchi");

    await prisma.blockedUser.upsert({
      where: { ownerId_blockedId: { ownerId, blockedId: targetUserId } },
      update: {},
      create: { ownerId, blockedId: targetUserId },
    });
  },

  async unblockUser(ownerId: string, targetUserId: string) {
    await prisma.blockedUser.deleteMany({ where: { ownerId, blockedId: targetUserId } });
  },

  async listBlocked(ownerId: string) {
    const blocked = await prisma.blockedUser.findMany({
      where: { ownerId },
      include: { blocked: { select: userSummarySelect } },
      orderBy: { createdAt: "desc" },
    });
    return blocked.map((b) => ({ id: b.id, user: b.blocked }));
  },

  async hasBlocked(ownerId: string, targetUserId: string) {
    const block = await prisma.blockedUser.findUnique({
      where: { ownerId_blockedId: { ownerId, blockedId: targetUserId } },
    });
    return !!block;
  },

  async isBlockedEitherWay(userId: string, otherUserId: string) {
    const block = await prisma.blockedUser.findFirst({
      where: {
        OR: [
          { ownerId: userId, blockedId: otherUserId },
          { ownerId: otherUserId, blockedId: userId },
        ],
      },
    });
    return !!block;
  },
};
