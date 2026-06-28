import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { CreateMiniAppInput, UpdateMiniAppInput } from "./miniapps.schema";

export const miniAppsService = {
  async create(userId: string, input: CreateMiniAppInput) {
    return prisma.miniApp.create({
      data: {
        ...input,
        creatorId: userId,
      },
      include: { creator: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
    });
  },

  async list(category?: string) {
    return prisma.miniApp.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { creator: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
    });
  },

  async getById(id: string) {
    const app = await prisma.miniApp.findUnique({
      where: { id },
      include: { creator: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
    });
    if (!app) throw Errors.notFound("Mini-dastur");
    return app;
  },

  async update(userId: string, id: string, input: UpdateMiniAppInput) {
    const app = await prisma.miniApp.findUnique({ where: { id } });
    if (!app) throw Errors.notFound("Mini-dastur");
    if (app.creatorId !== userId) throw Errors.forbidden("Faqat yaratuvchi o'zgartirishi mumkin");
    return prisma.miniApp.update({
      where: { id },
      data: input,
      include: { creator: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
    });
  },

  async remove(userId: string, id: string) {
    const app = await prisma.miniApp.findUnique({ where: { id } });
    if (!app) throw Errors.notFound("Mini-dastur");
    if (app.creatorId !== userId) throw Errors.forbidden("Faqat yaratuvchi o'chirishi mumkin");
    await prisma.miniApp.delete({ where: { id } });
  },

  async listMine(userId: string) {
    return prisma.miniApp.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { creator: { select: { id: true, displayName: true, username: true, avatarUrl: true } } },
    });
  },
};
