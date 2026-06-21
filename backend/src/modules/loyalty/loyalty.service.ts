import { prisma } from "../../config/prisma";

function getLevel(points: number): string {
  if (points >= 10000) return "diamond";
  if (points >= 5000) return "gold";
  if (points >= 1000) return "silver";
  return "bronze";
}

export const loyaltyService = {
  async getPoints(userId: string) {
    let record = await prisma.loyaltyPoints.findUnique({ where: { userId } });
    if (!record) {
      record = await prisma.loyaltyPoints.create({ data: { userId } });
    }
    return record;
  },

  async addPoints(userId: string, amount: number, type: string, reason: string) {
    const record = await prisma.loyaltyPoints.upsert({
      where: { userId },
      create: { userId, points: amount, level: getLevel(amount) },
      update: { points: { increment: amount } },
    });

    const newLevel = getLevel(record.points);
    if (newLevel !== record.level) {
      await prisma.loyaltyPoints.update({ where: { userId }, data: { level: newLevel } });
    }

    await prisma.loyaltyTransaction.create({
      data: { userId, amount, type, reason },
    });

    return { ...record, level: newLevel };
  },

  async spendPoints(userId: string, amount: number, reason: string) {
    const record = await prisma.loyaltyPoints.findUnique({ where: { userId } });
    if (!record || record.points < amount) {
      throw new Error("Ball yetarli emas");
    }

    await prisma.loyaltyPoints.update({
      where: { userId },
      data: { points: { decrement: amount } },
    });

    await prisma.loyaltyTransaction.create({
      data: { userId, amount: -amount, type: "spend", reason },
    });

    return { points: record.points - amount };
  },

  async getHistory(userId: string, limit = 50) {
    return prisma.loyaltyTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async getLeaderboard(limit = 20) {
    return prisma.loyaltyPoints.findMany({
      orderBy: { points: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
      },
    });
  },
};
