import { ConversationType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { isUserOnline } from "../../sockets";
import { hashPassword, verifyPassword } from "../../utils/password";
import {
  filterLastSeenSingle,
  getContactIds,
  getLastSeenExceptions,
  filterLastSeen,
  filterAvatarSingle,
  filterAvatar,
  filterBirthdaySingle,
  filterBirthday,
} from "../../utils/lastSeen";
import { chatsService } from "../chats/chats.service";
import {
  ChangePasswordInput,
  DeleteAccountInput,
  DisableTwoFactorInput,
  SetLastSeenExceptionInput,
  SetTwoFactorInput,
  UpdateProfileInput,
} from "./users.schema";

const profileSelect = {
  id: true,
  phone: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  customStatus: true,
  publicKey: true,
  lastSeenAt: true,
  lastSeenPrivacy: true,
  avatarPrivacy: true,
  birthdayDay: true,
  birthdayMonth: true,
  birthdayPrivacy: true,
  groupAddPrivacy: true,
  messagePrivacy: true,
  phoneNumberPrivacy: true,
  readReceiptsEnabled: true,
  typingIndicatorsEnabled: true,
  notifyPrivateChats: true,
  notifyGroupChats: true,
  notifyReactions: true,
  notifyMentions: true,
  hideNotificationContent: true,
  quietHoursEnabled: true,
  quietHoursStart: true,
  quietHoursEnd: true,
  quietHoursTimezoneOffset: true,
  defaultDisappearingSeconds: true,
  twoFactorHash: true,
  twoFactorHint: true,
  createdAt: true,
} as const;

function formatProfile<T extends { twoFactorHash: string | null }>(user: T) {
  const { twoFactorHash, ...rest } = user;
  return { ...rest, twoFactorEnabled: !!twoFactorHash };
}

const publicSelect = {
  id: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  customStatus: true,
  publicKey: true,
  lastSeenAt: true,
  lastSeenPrivacy: true,
  avatarPrivacy: true,
  birthdayDay: true,
  birthdayMonth: true,
  birthdayPrivacy: true,
} as const;

export const usersService = {
  async getOwnProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: profileSelect });
    if (!user) throw Errors.notFound("Foydalanuvchi");
    return formatProfile(user);
  },

  async updateProfile(userId: string, data: UpdateProfileInput) {
    if (data.username) {
      const existing = await prisma.user.findUnique({ where: { username: data.username }, select: { id: true } });
      if (existing && existing.id !== userId) throw Errors.conflict("Bu username band");
    }
    const user = await prisma.user.update({ where: { id: userId }, data, select: profileSelect });
    return formatProfile(user);
  },

  async getPublicProfile(userId: string, targetId: string) {
    const user = await prisma.user.findUnique({ where: { id: targetId }, select: publicSelect });
    if (!user) throw Errors.notFound("Foydalanuvchi");
    const filtered = await filterBirthdaySingle(userId, await filterAvatarSingle(userId, await filterLastSeenSingle(userId, user)));
    const notifyOnlineRequested = !!(await prisma.onlineNotifyRequest.findUnique({
      where: { ownerId_targetId: { ownerId: userId, targetId } },
    }));
    return { ...filtered, notifyOnlineRequested };
  },

  async subscribeOnlineNotify(ownerId: string, targetId: string) {
    if (ownerId === targetId) throw Errors.badRequest("O'zingizga obuna bo'lib bo'lmaydi");
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
    if (!target) throw Errors.notFound("Foydalanuvchi");
    if (isUserOnline(targetId)) throw Errors.conflict("Foydalanuvchi allaqachon onlayn");

    await prisma.onlineNotifyRequest.upsert({
      where: { ownerId_targetId: { ownerId, targetId } },
      update: {},
      create: { ownerId, targetId },
    });
  },

  async unsubscribeOnlineNotify(ownerId: string, targetId: string) {
    await prisma.onlineNotifyRequest.deleteMany({ where: { ownerId, targetId } });
  },

  async searchUsers(currentUserId: string, query: string) {
    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [
          { username: { contains: query, mode: "insensitive" } },
          { phone: query },
        ],
      },
      select: { ...publicSelect, phone: true, phoneNumberPrivacy: true },
      take: 20,
    });
    const [contactIds, exceptions] = await Promise.all([
      getContactIds(currentUserId),
      getLastSeenExceptions(currentUserId),
    ]);
    return users
      .filter((u) => {
        // Only the phone-search match is gated by phoneNumberPrivacy; a
        // username match is always visible regardless of this setting.
        if (u.phone !== query) return true;
        if (u.phoneNumberPrivacy === "NOBODY") return false;
        if (u.phoneNumberPrivacy === "CONTACTS") return contactIds.has(u.id);
        return true;
      })
      .map(({ phone, phoneNumberPrivacy, ...u }) =>
        filterBirthday(
          currentUserId,
          filterAvatar(currentUserId, filterLastSeen(currentUserId, u, contactIds, exceptions), contactIds),
          contactIds
        )
      );
  },

  async changePassword(userId: string, { currentPassword, newPassword }: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) throw Errors.notFound("Foydalanuvchi");

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw Errors.badRequest("Joriy parol noto'g'ri");

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  },

  async setTwoFactor(userId: string, { currentPassword, twoFactorPassword, hint }: SetTwoFactorInput) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) throw Errors.notFound("Foydalanuvchi");

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw Errors.badRequest("Joriy parol noto'g'ri");

    const twoFactorHash = await hashPassword(twoFactorPassword);
    await prisma.user.update({ where: { id: userId }, data: { twoFactorHash, twoFactorHint: hint ?? null } });
  },

  async disableTwoFactor(userId: string, { currentPassword }: DisableTwoFactorInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, twoFactorHash: true },
    });
    if (!user) throw Errors.notFound("Foydalanuvchi");
    if (!user.twoFactorHash) throw Errors.badRequest("Ikki bosqichli tekshiruv yoqilmagan");

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw Errors.badRequest("Joriy parol noto'g'ri");

    await prisma.user.update({ where: { id: userId }, data: { twoFactorHash: null, twoFactorHint: null } });
  },

  async deleteAccount(userId: string, { currentPassword }: DeleteAccountInput) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) throw Errors.notFound("Foydalanuvchi");

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw Errors.badRequest("Joriy parol noto'g'ri");

    // Leave every group first so ownership transfers/empty-group cleanup happen
    // the same way they would via the regular "leave group" flow.
    const groups = await prisma.conversationParticipant.findMany({
      where: { userId, conversation: { type: ConversationType.GROUP } },
      select: { conversationId: true },
    });

    const leaveResults: { conversationId: string; deleted: boolean; newOwnerId: string | null }[] = [];
    for (const { conversationId } of groups) {
      const result = await chatsService.leaveConversation(userId, conversationId);
      leaveResults.push({ conversationId, ...result });
    }

    await prisma.user.delete({ where: { id: userId } });

    return { leaveResults };
  },

  /** Lists this user's "Last seen" privacy exceptions for specific other users. */
  async listLastSeenExceptions(userId: string) {
    const exceptions = await prisma.lastSeenException.findMany({
      where: { ownerId: userId },
      include: { exceptionUser: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    });
    return exceptions.map((e) => ({ user: e.exceptionUser, mode: e.mode }));
  },

  /** Sets (or replaces) a "Last seen" privacy exception for a specific other user. */
  async setLastSeenException(userId: string, exceptionUserId: string, { mode }: SetLastSeenExceptionInput) {
    if (exceptionUserId === userId) throw Errors.badRequest("O'zingiz uchun istisno qo'sha olmaysiz");
    const target = await prisma.user.findUnique({ where: { id: exceptionUserId }, select: { id: true } });
    if (!target) throw Errors.notFound("Foydalanuvchi");

    await prisma.lastSeenException.upsert({
      where: { ownerId_exceptionUserId: { ownerId: userId, exceptionUserId } },
      update: { mode },
      create: { ownerId: userId, exceptionUserId, mode },
    });
  },

  /** Removes a "Last seen" privacy exception, reverting to the global lastSeenPrivacy setting for that user. */
  async removeLastSeenException(userId: string, exceptionUserId: string) {
    await prisma.lastSeenException.deleteMany({ where: { ownerId: userId, exceptionUserId } });
  },
};
