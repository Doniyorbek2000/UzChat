import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { CreateBroadcastListInput, UpdateBroadcastListInput } from "./broadcasts.schema";

// Keeps the broadcast list picker usable.
const MAX_BROADCAST_LISTS = 20;

async function sanitizeMemberIds(memberIds: string[], ownerId: string) {
  const ids = Array.from(new Set(memberIds)).filter((id) => id !== ownerId);
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const valid = new Set(users.map((u) => u.id));
  return ids.filter((id) => valid.has(id));
}

export const broadcastsService = {
  async list(userId: string) {
    return prisma.broadcastList.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
  },

  async create(userId: string, input: CreateBroadcastListInput) {
    const count = await prisma.broadcastList.count({ where: { userId } });
    if (count >= MAX_BROADCAST_LISTS) {
      throw Errors.badRequest(`Ko'pi bilan ${MAX_BROADCAST_LISTS} ta ro'yxat yaratish mumkin`);
    }

    const memberIds = await sanitizeMemberIds(input.memberIds, userId);
    if (memberIds.length === 0) throw Errors.badRequest("Kamida bitta a'zo tanlang");

    return prisma.broadcastList.create({
      data: { userId, name: input.name, memberIds },
    });
  },

  async update(userId: string, listId: string, input: UpdateBroadcastListInput) {
    const list = await prisma.broadcastList.findUnique({ where: { id: listId } });
    if (!list || list.userId !== userId) throw Errors.notFound("Ro'yxat");

    let memberIds = input.memberIds;
    if (memberIds) {
      memberIds = await sanitizeMemberIds(memberIds, userId);
      if (memberIds.length === 0) throw Errors.badRequest("Kamida bitta a'zo tanlang");
    }

    return prisma.broadcastList.update({
      where: { id: listId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(memberIds !== undefined ? { memberIds } : {}),
      },
    });
  },

  async remove(userId: string, listId: string) {
    const list = await prisma.broadcastList.findUnique({ where: { id: listId } });
    if (!list || list.userId !== userId) throw Errors.notFound("Ro'yxat");

    await prisma.broadcastList.delete({ where: { id: listId } });
  },
};
