import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { CreateFolderInput, UpdateFolderInput } from "./folders.schema";

// Keeps the chat list tab bar usable; matches Telegram's folder limit.
const MAX_FOLDERS = 10;

export const foldersService = {
  async list(userId: string) {
    return prisma.chatFolder.findMany({
      where: { userId },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
  },

  async create(userId: string, input: CreateFolderInput) {
    const count = await prisma.chatFolder.count({ where: { userId } });
    if (count >= MAX_FOLDERS) {
      throw Errors.badRequest(`Ko'pi bilan ${MAX_FOLDERS} ta papka yaratish mumkin`);
    }

    return prisma.chatFolder.create({
      data: { userId, name: input.name, icon: input.icon ?? null, order: count },
    });
  },

  async update(userId: string, folderId: string, input: UpdateFolderInput) {
    const folder = await prisma.chatFolder.findUnique({ where: { id: folderId } });
    if (!folder || folder.userId !== userId) throw Errors.notFound("Papka");

    let conversationIds = input.conversationIds;
    if (conversationIds) {
      const memberships = await prisma.conversationParticipant.findMany({
        where: { userId, conversationId: { in: conversationIds } },
        select: { conversationId: true },
      });
      const allowed = new Set(memberships.map((m) => m.conversationId));
      conversationIds = conversationIds.filter((id) => allowed.has(id));
    }

    return prisma.chatFolder.update({
      where: { id: folderId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.icon !== undefined ? { icon: input.icon } : {}),
        ...(input.order !== undefined ? { order: input.order } : {}),
        ...(conversationIds !== undefined ? { conversationIds } : {}),
        ...(input.includeUnread !== undefined ? { includeUnread: input.includeUnread } : {}),
        ...(input.includeGroups !== undefined ? { includeGroups: input.includeGroups } : {}),
        ...(input.includeDirect !== undefined ? { includeDirect: input.includeDirect } : {}),
        ...(input.excludeMuted !== undefined ? { excludeMuted: input.excludeMuted } : {}),
      },
    });
  },

  async remove(userId: string, folderId: string) {
    const folder = await prisma.chatFolder.findUnique({ where: { id: folderId } });
    if (!folder || folder.userId !== userId) throw Errors.notFound("Papka");

    await prisma.chatFolder.delete({ where: { id: folderId } });
  },
};
