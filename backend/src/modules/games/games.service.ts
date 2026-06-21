import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { CreateGameInput } from "./games.schema";

const userSelect = { id: true, displayName: true, username: true, avatarUrl: true };

export const gamesService = {
  async listPopular() {
    return prisma.game.findMany({
      where: { isActive: true },
      include: { developer: { select: userSelect } },
      orderBy: { playCount: "desc" },
      take: 30,
    });
  },

  async listByCategory(category: string) {
    return prisma.game.findMany({
      where: { isActive: true, category },
      include: { developer: { select: userSelect } },
      orderBy: { playCount: "desc" },
    });
  },

  async getGame(gameId: string) {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: { developer: { select: userSelect } },
    });
    if (!game) throw Errors.notFound("O'yin topilmadi");
    return game;
  },

  async create(userId: string, input: CreateGameInput) {
    return prisma.game.create({
      data: { ...input, developerId: userId },
      include: { developer: { select: userSelect } },
    });
  },

  async play(gameId: string) {
    await prisma.game.update({ where: { id: gameId }, data: { playCount: { increment: 1 } } });
  },

  async submitScore(userId: string, gameId: string, score: number) {
    return prisma.gameScore.create({
      data: { gameId, userId, score },
      include: { user: { select: userSelect } },
    });
  },

  async getLeaderboard(gameId: string) {
    return prisma.gameScore.findMany({
      where: { gameId },
      include: { user: { select: userSelect } },
      orderBy: { score: "desc" },
      take: 50,
      distinct: ["userId"],
    });
  },

  async getMyGames(userId: string) {
    return prisma.game.findMany({
      where: { developerId: userId },
      orderBy: { createdAt: "desc" },
    });
  },
};
