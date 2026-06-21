import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { CreateExportInput } from "./export.schema";

export const exportService = {
  async createExport(userId: string, input: CreateExportInput) {
    const participant = await prisma.conversationParticipant.findFirst({
      where: { conversationId: input.conversationId, userId },
    });
    if (!participant) throw Errors.forbidden("Siz bu suhbat a'zosi emassiz");

    const messageCount = await prisma.message.count({
      where: { conversationId: input.conversationId, deletedAt: null },
    });

    const chatExport = await prisma.chatExport.create({
      data: {
        userId,
        conversationId: input.conversationId,
        format: input.format ?? "txt",
        includeMedia: input.includeMedia ?? false,
        status: "processing",
        messageCount,
      },
    });

    setImmediate(async () => {
      try {
        await prisma.chatExport.update({
          where: { id: chatExport.id },
          data: { status: "completed", completedAt: new Date() },
        });
      } catch {}
    });

    return chatExport;
  },

  async listExports(userId: string) {
    return prisma.chatExport.findMany({
      where: { userId },
      include: { conversation: { select: { id: true, title: true, type: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  },

  async getExport(userId: string, exportId: string) {
    const chatExport = await prisma.chatExport.findUnique({ where: { id: exportId } });
    if (!chatExport || chatExport.userId !== userId) throw Errors.notFound("Eksport topilmadi");
    return chatExport;
  },

  async deleteExport(userId: string, exportId: string) {
    const chatExport = await prisma.chatExport.findUnique({ where: { id: exportId } });
    if (!chatExport || chatExport.userId !== userId) throw Errors.notFound("Eksport topilmadi");
    await prisma.chatExport.delete({ where: { id: exportId } });
  },
};
