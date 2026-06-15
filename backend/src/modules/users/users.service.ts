import { ConversationType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { isUserOnline, disconnectSession } from "../../sockets";
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
  filterBioSingle,
  filterBio,
} from "../../utils/lastSeen";
import { chatsService } from "../chats/chats.service";
import { pushService } from "../push/push.service";
import {
  ChangePasswordInput,
  DeleteAccountInput,
  DisableTwoFactorInput,
  SetLastSeenExceptionInput,
  SetTwoFactorInput,
  UpdateProfileInput,
} from "./users.schema";

const DAY_MS = 24 * 60 * 60 * 1000;
// How often a user may change their username.
const USERNAME_CHANGE_COOLDOWN_DAYS = 7;

const NOTIFICATIONS_PAUSE_DURATIONS_MS: Record<"1h" | "8h" | "1d", number> = {
  "1h": 60 * 60 * 1000,
  "8h": 8 * 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};
// How long a freed-up username stays reserved (can't be claimed by someone else).
const USERNAME_RESERVATION_DAYS = 30;

const profileSelect = {
  id: true,
  phone: true,
  username: true,
  usernameChangedAt: true,
  displayName: true,
  avatarUrl: true,
  bio: true,
  customStatus: true,
  customStatusExpiresAt: true,
  publicKey: true,
  lastSeenAt: true,
  lastSeenPrivacy: true,
  avatarPrivacy: true,
  bioPrivacy: true,
  birthdayDay: true,
  birthdayMonth: true,
  birthdayPrivacy: true,
  groupAddPrivacy: true,
  messagePrivacy: true,
  phoneNumberPrivacy: true,
  forwardedMessagePrivacy: true,
  readReceiptsEnabled: true,
  typingIndicatorsEnabled: true,
  notifyPrivateChats: true,
  notifyGroupChats: true,
  notifyReactions: true,
  notifyMentions: true,
  hideNotificationContent: true,
  includeMutedInBadge: true,
  quietHoursEnabled: true,
  quietHoursStart: true,
  quietHoursEnd: true,
  quietHoursTimezoneOffset: true,
  notificationsPaused: true,
  notificationsPausedUntil: true,
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
  customStatusExpiresAt: true,
  publicKey: true,
  lastSeenAt: true,
  lastSeenPrivacy: true,
  avatarPrivacy: true,
  bioPrivacy: true,
  birthdayDay: true,
  birthdayMonth: true,
  birthdayPrivacy: true,
  selfDestructDays: true,
} as const;

/** Leaves all of the user's groups (transferring ownership / cleaning up empty groups as needed), then deletes the account. */
async function leaveGroupsAndDeleteUser(userId: string) {
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
}

export const usersService = {
  async getOwnProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: profileSelect });
    if (!user) throw Errors.notFound("Foydalanuvchi");
    return formatProfile(user);
  },

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const { customStatusClearAfterSeconds, pauseNotificationsFor, ...rest } = data;
    let usernameChangedAt: Date | undefined;
    if (data.username) {
      const current = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, usernameChangedAt: true },
      });
      if (!current) throw Errors.notFound("Foydalanuvchi");

      if (data.username !== current.username) {
        if (current.usernameChangedAt) {
          const remainingMs = current.usernameChangedAt.getTime() + USERNAME_CHANGE_COOLDOWN_DAYS * DAY_MS - Date.now();
          if (remainingMs > 0) {
            const remainingDays = Math.ceil(remainingMs / DAY_MS);
            throw Errors.badRequest(
              `Username ${USERNAME_CHANGE_COOLDOWN_DAYS} kunda bir marta o'zgartirilishi mumkin. Yana ${remainingDays} kundan keyin urinib ko'ring`
            );
          }
        }

        const existing = await prisma.user.findUnique({ where: { username: data.username }, select: { id: true } });
        if (existing && existing.id !== userId) throw Errors.conflict("Bu username band");

        const reserved = await prisma.usernameHistory.findFirst({
          where: {
            oldUsername: data.username,
            userId: { not: userId },
            changedAt: { gt: new Date(Date.now() - USERNAME_RESERVATION_DAYS * DAY_MS) },
          },
        });
        if (reserved) throw Errors.conflict("Bu username vaqtincha band");

        await prisma.usernameHistory.create({ data: { userId, oldUsername: current.username } });
        usernameChangedAt = new Date();
      }
    }
    let customStatusExpiresAt: Date | null | undefined;
    if (data.customStatus !== undefined) {
      customStatusExpiresAt =
        data.customStatus && customStatusClearAfterSeconds
          ? new Date(Date.now() + customStatusClearAfterSeconds * 1000)
          : null;
    }

    let notificationsPauseData: { notificationsPaused: boolean; notificationsPausedUntil: Date | null } | undefined;
    if (pauseNotificationsFor === "off") notificationsPauseData = { notificationsPaused: false, notificationsPausedUntil: null };
    else if (pauseNotificationsFor === "forever") notificationsPauseData = { notificationsPaused: true, notificationsPausedUntil: null };
    else if (pauseNotificationsFor !== undefined)
      notificationsPauseData = {
        notificationsPaused: false,
        notificationsPausedUntil: new Date(Date.now() + NOTIFICATIONS_PAUSE_DURATIONS_MS[pauseNotificationsFor]),
      };

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...rest,
        ...(usernameChangedAt ? { usernameChangedAt } : {}),
        ...(customStatusExpiresAt !== undefined ? { customStatusExpiresAt } : {}),
        ...(notificationsPauseData ?? {}),
      },
      select: profileSelect,
    });
    return formatProfile(user);
  },

  /** Lists this user's previous usernames, most recent first. */
  async getUsernameHistory(userId: string) {
    return prisma.usernameHistory.findMany({
      where: { userId },
      orderBy: { changedAt: "desc" },
      select: { oldUsername: true, changedAt: true },
    });
  },

  async getPublicProfile(userId: string, targetId: string) {
    const user = await prisma.user.findUnique({ where: { id: targetId }, select: publicSelect });
    if (!user) throw Errors.notFound("Foydalanuvchi");
    const filtered = await filterBioSingle(
      userId,
      await filterBirthdaySingle(userId, await filterAvatarSingle(userId, await filterLastSeenSingle(userId, user)))
    );
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
        filterBio(
          currentUserId,
          filterBirthday(
            currentUserId,
            filterAvatar(currentUserId, filterLastSeen(currentUserId, u, contactIds, exceptions), contactIds),
            contactIds
          ),
          contactIds
        )
      );
  },

  async changePassword(userId: string, currentSessionId: string, { currentPassword, newPassword }: ChangePasswordInput) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) throw Errors.notFound("Foydalanuvchi");

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw Errors.badRequest("Joriy parol noto'g'ri");

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    // Force re-login on other devices in case the old password was compromised.
    const otherSessions = await prisma.refreshToken.findMany({
      where: { userId, id: { not: currentSessionId }, revokedAt: null },
      select: { id: true },
    });
    await prisma.refreshToken.updateMany({
      where: { id: { in: otherSessions.map((s) => s.id) } },
      data: { revokedAt: new Date() },
    });
    otherSessions.forEach((s) => disconnectSession(s.id));

    await pushService.sendToUsers([userId], {
      title: "Parol o'zgartirildi",
      body: "Hisobingiz paroli o'zgartirildi. Agar bu siz bo'lmasangiz, darhol hisobingizni tekshiring",
      data: { type: "security" },
    });
  },

  async setTwoFactor(userId: string, { currentPassword, twoFactorPassword, hint }: SetTwoFactorInput) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) throw Errors.notFound("Foydalanuvchi");

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw Errors.badRequest("Joriy parol noto'g'ri");

    const twoFactorHash = await hashPassword(twoFactorPassword);
    await prisma.user.update({ where: { id: userId }, data: { twoFactorHash, twoFactorHint: hint ?? null } });

    await pushService.sendToUsers([userId], {
      title: "Ikki bosqichli tekshiruv yoqildi",
      body: "Hisobingiz uchun ikki bosqichli tekshiruv (bulut paroli) yoqildi",
      data: { type: "security" },
    });
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

    await pushService.sendToUsers([userId], {
      title: "Ikki bosqichli tekshiruv o'chirildi",
      body: "Hisobingiz uchun ikki bosqichli tekshiruv o'chirildi. Agar bu siz bo'lmasangiz, darhol hisobingizni tekshiring",
      data: { type: "security" },
    });
  },

  async deleteAccount(userId: string, { currentPassword }: DeleteAccountInput) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) throw Errors.notFound("Foydalanuvchi");

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) throw Errors.badRequest("Joriy parol noto'g'ri");

    return leaveGroupsAndDeleteUser(userId);
  },

  /**
   * Permanently deletes accounts that have been inactive (no login/connection)
   * longer than their configured selfDestructDays. Mirrors Telegram's
   * "self-destruct" account setting. Run periodically by a background job.
   */
  async deleteInactiveAccounts() {
    const users = await prisma.user.findMany({ select: { id: true, lastSeenAt: true, selfDestructDays: true } });

    const now = Date.now();
    let deletedCount = 0;
    for (const user of users) {
      const inactiveMs = now - user.lastSeenAt.getTime();
      const deadlineMs = user.selfDestructDays * DAY_MS;
      if (inactiveMs >= deadlineMs) {
        await leaveGroupsAndDeleteUser(user.id);
        deletedCount++;
      } else if (inactiveMs >= deadlineMs - DAY_MS) {
        await pushService.sendToUsers([user.id], {
          title: "Hisobingiz o'chirilishi mumkin",
          body: "Uzoq muddat faolsizlik tufayli hisobingiz ertaga avtomatik o'chiriladi. Faol bo'lish uchun ilovaga kiring",
          data: { type: "account_inactivity_warning" },
        });
      }
    }
    return { deletedCount };
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

  /** Clears custom statuses whose auto-clear time has passed. */
  async clearExpiredCustomStatuses() {
    const { count } = await prisma.user.updateMany({
      where: { customStatusExpiresAt: { lte: new Date() } },
      data: { customStatus: null, customStatusExpiresAt: null },
    });
    return count;
  },
};
