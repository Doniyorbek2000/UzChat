import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";

export const cloudService = {
  async listFiles(userId: string, folderId?: string) {
    return prisma.cloudFile.findMany({
      where: { userId, folderId: folderId ?? null },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  },

  async listFolders(userId: string, parentId?: string) {
    return prisma.cloudFolder.findMany({
      where: { userId, parentId: parentId ?? null },
      include: { _count: { select: { files: true, children: true } } },
      orderBy: { name: "asc" },
      take: 100,
    });
  },

  async createFolder(userId: string, name: string, parentId?: string) {
    return prisma.cloudFolder.create({
      data: { userId, name, parentId },
    });
  },

  async uploadFile(userId: string, input: { name: string; path: string; mimeType: string; size: number; url: string; folderId?: string }) {
    return prisma.cloudFile.create({
      data: { userId, ...input },
    });
  },

  async deleteFile(userId: string, fileId: string) {
    const file = await prisma.cloudFile.findUnique({ where: { id: fileId } });
    if (!file || file.userId !== userId) throw Errors.notFound("Fayl topilmadi");
    await prisma.cloudFile.delete({ where: { id: fileId } });
  },

  async deleteFolder(userId: string, folderId: string) {
    const folder = await prisma.cloudFolder.findUnique({ where: { id: folderId } });
    if (!folder || folder.userId !== userId) throw Errors.notFound("Papka topilmadi");
    await prisma.cloudFolder.delete({ where: { id: folderId } });
  },

  async getUsage(userId: string) {
    const result = await prisma.cloudFile.aggregate({
      where: { userId },
      _sum: { size: true },
      _count: true,
    });
    return { totalSize: result._sum.size ?? 0, fileCount: result._count };
  },
};
