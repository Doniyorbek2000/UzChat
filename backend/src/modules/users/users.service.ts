import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { hashPassword, verifyPassword } from "../../utils/password";
import { filterLastSeenSingle, getContactIds, filterLastSeen } from "../../utils/lastSeen";
import { ChangePasswordInput, UpdateProfileInput } from "./users.schema";

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
  createdAt: true,
} as const;

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
    return user;
  },

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const user = await prisma.user.update({ where: { id: userId }, data, select: profileSelect });
    return user;
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
};
