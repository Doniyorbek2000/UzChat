import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { hashPassword, verifyPassword } from "../../utils/password";
import { filterLastSeenSingle, getContactIds, filterLastSeen } from "../../utils/lastSeen";
import { ChangePasswordInput, DisableTwoFactorInput, SetTwoFactorInput, UpdateProfileInput } from "./users.schema";

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
  readReceiptsEnabled: true,
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
      select: publicSelect,
      take: 20,
    });
    const contactIds = await getContactIds(currentUserId);
    return users.map((u) => filterLastSeen(currentUserId, u, contactIds));
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
};
