import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { CreateStickerPackInput, AddStickerInput } from "./stickers.schema";

const packInclude = {
  stickers: { orderBy: { order: "asc" as const } },
  creator: { select: { id: true, username: true, displayName: true } },
  _count: { select: { installedBy: true } },
};

export const stickersService = {
  async createPack(userId: string, input: CreateStickerPackInput) {
    return prisma.stickerPack.create({
      data: { ...input, creatorId: userId },
      include: packInclude,
    });
  },

  async addSticker(userId: string, packId: string, input: AddStickerInput) {
    const pack = await prisma.stickerPack.findUnique({ where: { id: packId } });
    if (!pack) throw Errors.notFound("Sticker to'plam");
    if (pack.creatorId !== userId) throw Errors.forbidden("Faqat yaratuvchi sticker qo'sha oladi");

    const maxOrder = await prisma.sticker.aggregate({ where: { packId }, _max: { order: true } });
    return prisma.sticker.create({
      data: { packId, imageUrl: input.imageUrl, emoji: input.emoji, order: (maxOrder._max.order ?? -1) + 1 },
    });
  },

  async removeSticker(userId: string, stickerId: string) {
    const sticker = await prisma.sticker.findUnique({ where: { id: stickerId }, include: { pack: true } });
    if (!sticker) throw Errors.notFound("Sticker");
    if (sticker.pack.creatorId !== userId) throw Errors.forbidden();
    await prisma.sticker.delete({ where: { id: stickerId } });
  },

  async getPack(packId: string) {
    const pack = await prisma.stickerPack.findUnique({ where: { id: packId }, include: packInclude });
    if (!pack) throw Errors.notFound("Sticker to'plam");
    return pack;
  },

  async listPacks(query?: string) {
    return prisma.stickerPack.findMany({
      where: query ? { name: { contains: query, mode: "insensitive" } } : undefined,
      orderBy: { installCount: "desc" },
      take: 50,
      include: {
        stickers: { take: 5, orderBy: { order: "asc" } },
        creator: { select: { id: true, username: true, displayName: true } },
        _count: { select: { installedBy: true } },
      },
    });
  },

  async listFeatured() {
    return prisma.stickerPack.findMany({
      where: { isOfficial: true },
      orderBy: { installCount: "desc" },
      include: {
        stickers: { take: 5, orderBy: { order: "asc" } },
        creator: { select: { id: true, username: true, displayName: true } },
        _count: { select: { installedBy: true } },
      },
    });
  },

  async installPack(userId: string, packId: string) {
    const pack = await prisma.stickerPack.findUnique({ where: { id: packId } });
    if (!pack) throw Errors.notFound("Sticker to'plam");

    await prisma.stickerPackInstall.upsert({
      where: { userId_packId: { userId, packId } },
      update: {},
      create: { userId, packId },
    });
    await prisma.stickerPack.update({ where: { id: packId }, data: { installCount: { increment: 1 } } });
  },

  async uninstallPack(userId: string, packId: string) {
    const deleted = await prisma.stickerPackInstall.deleteMany({ where: { userId, packId } });
    if (deleted.count > 0) {
      await prisma.stickerPack.update({ where: { id: packId }, data: { installCount: { decrement: 1 } } });
    }
  },

  async listInstalled(userId: string) {
    const installs = await prisma.stickerPackInstall.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        pack: {
          include: {
            stickers: { orderBy: { order: "asc" } },
            _count: { select: { installedBy: true } },
          },
        },
      },
    });
    return installs.map((i) => i.pack);
  },

  async listMyPacks(userId: string) {
    return prisma.stickerPack.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: "desc" },
      include: packInclude,
    });
  },

  async deletePack(userId: string, packId: string) {
    const pack = await prisma.stickerPack.findUnique({ where: { id: packId } });
    if (!pack) throw Errors.notFound("Sticker to'plam");
    if (pack.creatorId !== userId) throw Errors.forbidden();
    await prisma.stickerPack.delete({ where: { id: packId } });
  },
};
