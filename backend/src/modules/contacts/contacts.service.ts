import { ContactStatus, LastSeenPrivacy } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import {
  filterBio,
  filterBioSingle,
  filterBirthday,
  filterLastSeen,
  filterLastSeenSingle,
  getContactIds,
  getLastSeenExceptions,
} from "../../utils/lastSeen";
import { pushService } from "../push/push.service";
import { UpdateContactInput } from "./contacts.schema";

// Returns the number of days from `from` until the next occurrence of the given
// month/day (0 if it falls on `from` itself, wrapping to next year if already passed).
function daysUntilBirthday(month: number, day: number, from: Date): number {
  const today = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  let next = Date.UTC(from.getUTCFullYear(), month - 1, day);
  if (next < today) next = Date.UTC(from.getUTCFullYear() + 1, month - 1, day);
  return Math.round((next - today) / (1000 * 60 * 60 * 24));
}

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

    const mutuals =
      requests.length === 0
        ? []
        : await prisma.contact.groupBy({
            by: ["targetId"],
            where: {
              ownerId: { in: [...contactIds] },
              status: ContactStatus.ACCEPTED,
              targetId: { in: requests.map((r) => r.ownerId) },
            },
            _count: { ownerId: true },
          });
    const mutualCountByUserId = new Map(mutuals.map((m) => [m.targetId, m._count.ownerId]));

    return requests.map((r) => ({
      ...r,
      mutualCount: mutualCountByUserId.get(r.ownerId) ?? 0,
      owner: filterBio(userId, filterLastSeen(userId, r.owner, contactIds, exceptions), contactIds),
    }));
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

  // Suggests other users who share accepted contacts with `userId` ("people you
  // may know"), excluding existing contacts/requests, blocked users, and users
  // the owner has previously dismissed. Sorted by mutual contact count, desc.
  async listSuggestions(userId: string) {
    const contactIds = await getContactIds(userId);
    if (contactIds.size === 0) return [];

    const [mutuals, existingContacts, blocked, dismissed] = await Promise.all([
      prisma.contact.groupBy({
        by: ["targetId"],
        where: {
          ownerId: { in: [...contactIds] },
          status: ContactStatus.ACCEPTED,
          targetId: { notIn: [...contactIds, userId] },
        },
        _count: { ownerId: true },
        orderBy: { _count: { ownerId: "desc" } },
        take: 20,
      }),
      prisma.contact.findMany({
        where: { OR: [{ ownerId: userId }, { targetId: userId }] },
        select: { ownerId: true, targetId: true },
      }),
      prisma.blockedUser.findMany({
        where: { OR: [{ ownerId: userId }, { blockedId: userId }] },
        select: { ownerId: true, blockedId: true },
      }),
      prisma.dismissedSuggestion.findMany({
        where: { ownerId: userId },
        select: { dismissedUserId: true },
      }),
    ]);

    const excludeIds = new Set<string>();
    for (const c of existingContacts) excludeIds.add(c.ownerId === userId ? c.targetId : c.ownerId);
    for (const b of blocked) excludeIds.add(b.ownerId === userId ? b.blockedId : b.ownerId);
    for (const d of dismissed) excludeIds.add(d.dismissedUserId);

    const candidates = mutuals.filter((m) => !excludeIds.has(m.targetId));
    if (candidates.length === 0) return [];

    const users = await prisma.user.findMany({
      where: { id: { in: candidates.map((c) => c.targetId) } },
      select: userSummarySelect,
    });
    const usersById = new Map(users.map((u) => [u.id, u]));
    const exceptions = await getLastSeenExceptions(userId);

    return candidates
      .map((c) => {
        const user = usersById.get(c.targetId);
        if (!user) return null;
        return {
          user: filterBio(userId, filterLastSeen(userId, user, contactIds, exceptions), contactIds),
          mutualCount: c._count.ownerId,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  },

  async dismissSuggestion(userId: string, targetUserId: string) {
    await prisma.dismissedSuggestion.upsert({
      where: { ownerId_dismissedUserId: { ownerId: userId, dismissedUserId: targetUserId } },
      update: {},
      create: { ownerId: userId, dismissedUserId: targetUserId },
    });
  },

  // Accepted contacts whose birthday falls within the next 30 days, soonest first.
  async listUpcomingBirthdays(userId: string) {
    const contacts = await prisma.contact.findMany({
      where: {
        ownerId: userId,
        status: ContactStatus.ACCEPTED,
        target: {
          birthdayDay: { not: null },
          birthdayMonth: { not: null },
          birthdayPrivacy: { not: LastSeenPrivacy.NOBODY },
        },
      },
      select: {
        target: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            birthdayDay: true,
            birthdayMonth: true,
            birthdayPrivacy: true,
          },
        },
      },
    });

    const contactIds = await getContactIds(userId);
    const now = new Date();

    return contacts
      .map((c) => {
        const user = filterBirthday(userId, c.target, contactIds);
        if (user.birthdayDay == null || user.birthdayMonth == null) return null;
        return { user, daysUntil: daysUntilBirthday(user.birthdayMonth, user.birthdayDay, now) };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && x.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  },

  // Accepted contacts that `userId` and `otherUserId` both have, excluding `otherUserId` themselves.
  async listMutualContacts(userId: string, otherUserId: string) {
    const [myContactIds, theirContactIds] = await Promise.all([getContactIds(userId), getContactIds(otherUserId)]);
    const mutualIds = [...myContactIds].filter((id) => theirContactIds.has(id) && id !== otherUserId);
    if (mutualIds.length === 0) return [];

    const [users, exceptions] = await Promise.all([
      prisma.user.findMany({ where: { id: { in: mutualIds } }, select: userSummarySelect }),
      getLastSeenExceptions(userId),
    ]);
    return users.map((u) => filterBio(userId, filterLastSeen(userId, u, myContactIds, exceptions), myContactIds));
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
