import { ConversationType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { hashPassword, verifyPassword } from "../../utils/password";
import { filterLastSeenSingle, getContactIds, filterLastSeen } from "../../utils/lastSeen";
import { chatsService } from "../chats/chats.service";
import {
  ChangePasswordInput,
  DeleteAccountInput,
  DisableTwoFactorInput,
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
  publicKey: true,
  lastSeenAt: true,
  lastSeenPrivacy: true,
  groupAddPrivacy: true,
  messagePrivacy: true,
  phoneNumberPrivacy: true,
  readReceiptsEnabled: true,
  typingIndicatorsEnabled: true,
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
  publicKey: true,
  lastSeenAt: true,
  lastSeenPrivacy: true,
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
    return filterLastSeenSingle(userId, user);
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
    const contactIds = await getContactIds(currentUserId);
    return users
      .filter((u) => {
        // Only the phone-search match is gated by phoneNumberPrivacy; a
        // username match is always visible regardless of this setting.
        if (u.phone !== query) return true;
        if (u.phoneNumberPrivacy === "NOBODY") return false;
        if (u.phoneNumberPrivacy === "CONTACTS") return contactIds.has(u.id);
        return true;
      })
      .map(({ phone, phoneNumberPrivacy, ...u }) => filterLastSeen(currentUserId, u, contactIds));
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
};
