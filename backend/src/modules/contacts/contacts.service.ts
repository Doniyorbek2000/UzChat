import { ContactStatus, LastSeenPrivacy } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import {
  filterBio,
  filterBioSingle,
  filterLastSeen,
  filterLastSeenSingle,
  getContactIds,
  getLastSeenExceptions,
} from "../../utils/lastSeen";
import { pushService } from "../push/push.service";
import { UpdateContactInput } from "./contacts.schema";

const userSummarySelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  bioPrivacy: true,
  publicKey: true,
  lastSeenAt: true,
  lastSeenPrivacy: true,
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

    const sender = await prisma.user.findUnique({ where: { id: ownerId }, select: { displayName: true } });
    await pushService.sendToUsers([target.id], {
      title: "Yangi kontakt so'rovi",
      body: `${sender?.displayName} sizni kontaktlar ro'yxatiga qo'shmoqchi`,
      data: { type: "contact_request" },
    });

    return { ...contact, target: await filterBioSingle(ownerId, await filterLastSeenSingle(ownerId, contact.target)) };
  },

  async listIncomingRequests(userId: string) {
    const requests = await prisma.contact.findMany({
      where: { targetId: userId, status: ContactStatus.PENDING },
      include: { owner: { select: userSummarySelect } },
      orderBy: { createdAt: "desc" },
    });
    const [contactIds, exceptions] = await Promise.all([getContactIds(userId), getLastSeenExceptions(userId)]);
    return requests.map((r) => ({ ...r, owner: filterBio(userId, filterLastSeen(userId, r.owner, contactIds, exceptions), contactIds) }));
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

    const accepter = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
    await pushService.sendToUsers([request.ownerId], {
      title: "Kontakt so'rovi qabul qilindi",
      body: `${accepter?.displayName} so'rovingizni qabul qildi`,
      data: { type: "contact_accepted" },
    });
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
      orderBy: [{ isFavorite: "desc" }, { target: { displayName: "asc" } }],
    });
    const [contactIds, exceptions] = await Promise.all([getContactIds(userId), getLastSeenExceptions(userId)]);
    return contacts.map((c) => ({
      id: c.id,
      alias: c.alias,
      isFavorite: c.isFavorite,
      note: c.note,
      user: filterBio(userId, filterLastSeen(userId, c.target, contactIds, exceptions), contactIds),
    }));
  },

  async removeContact(userId: string, contactId: string) {
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.ownerId !== userId) throw Errors.notFound("Kontakt");
    await prisma.contact.delete({ where: { id: contactId } });
  },

  async updateContact(userId: string, contactId: string, data: UpdateContactInput) {
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact || contact.ownerId !== userId) throw Errors.notFound("Kontakt");

    const updated = await prisma.contact.update({ where: { id: contactId }, data });
    return { id: updated.id, alias: updated.alias, isFavorite: updated.isFavorite, note: updated.note };
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
    const [contactIds, exceptions] = await Promise.all([getContactIds(ownerId), getLastSeenExceptions(ownerId)]);
    return blocked.map((b) => ({ id: b.id, user: filterBio(ownerId, filterLastSeen(ownerId, b.blocked, contactIds, exceptions), contactIds) }));
  },

  async hasBlocked(ownerId: string, targetUserId: string) {
    const block = await prisma.blockedUser.findUnique({
      where: { ownerId_blockedId: { ownerId, blockedId: targetUserId } },
    });
    return !!block;
  },

  // Notifies users whose accepted contacts have a birthday today (UTC date),
  // unless that contact has set their birthday privacy to "nobody".
  async sendBirthdayReminders() {
    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const day = now.getUTCDate();

    const contacts = await prisma.contact.findMany({
      where: {
        status: ContactStatus.ACCEPTED,
        target: { birthdayDay: day, birthdayMonth: month, birthdayPrivacy: { not: LastSeenPrivacy.NOBODY } },
      },
      select: { ownerId: true, target: { select: { id: true, displayName: true } } },
    });

    for (const contact of contacts) {
      await pushService.sendToUsers([contact.ownerId], {
        title: "🎂 Tug'ilgan kun",
        body: `Bugun ${contact.target.displayName}ning tug'ilgan kuni!`,
        data: { type: "birthday", userId: contact.target.id },
      });
    }
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
