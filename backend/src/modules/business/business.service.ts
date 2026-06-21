import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { CreateBusinessProfileInput } from "./business.schema";

export const businessService = {
  async getProfile(userId: string) {
    return prisma.businessProfile.findUnique({ where: { userId } });
  },

  async createOrUpdate(userId: string, input: CreateBusinessProfileInput) {
    return prisma.businessProfile.upsert({
      where: { userId },
      create: { userId, ...input },
      update: input,
    });
  },

  async getPublicProfile(userId: string) {
    const profile = await prisma.businessProfile.findUnique({ where: { userId } });
    if (!profile) throw Errors.notFound("Biznes profil topilmadi");
    return profile;
  },

  async search(query: string) {
    return prisma.businessProfile.findMany({
      where: {
        OR: [
          { businessName: { contains: query, mode: "insensitive" } },
          { category: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      include: { user: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
      take: 30,
    });
  },

  async listByCategory(category: string) {
    return prisma.businessProfile.findMany({
      where: { category: { contains: category, mode: "insensitive" } },
      include: { user: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
      orderBy: { businessName: "asc" },
    });
  },

  async deleteProfile(userId: string) {
    await prisma.businessProfile.deleteMany({ where: { userId } });
  },
};
