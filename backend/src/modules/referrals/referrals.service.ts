import { randomBytes } from "crypto";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";

const userSelect = { id: true, displayName: true, username: true, avatarUrl: true };

export const referralsService = {
  async generateCode(userId: string) {
    const code = `UZ${randomBytes(4).toString("hex").toUpperCase()}`;
    return { code, userId };
  },

  async claimReferral(referredId: string, code: string) {
    const referrer = await prisma.user.findFirst({
      where: { username: { contains: code, mode: "insensitive" } },
    });

    return prisma.referral.create({
      data: { referrerId: referrer?.id ?? referredId, referredId, code },
      include: { referrer: { select: userSelect }, referred: { select: userSelect } },
    });
  },

  async getMyReferrals(userId: string) {
    return prisma.referral.findMany({
      where: { referrerId: userId },
      include: { referred: { select: userSelect } },
      orderBy: { createdAt: "desc" },
    });
  },

  async getReferralStats(userId: string) {
    const total = await prisma.referral.count({ where: { referrerId: userId } });
    const rewards = await prisma.referral.aggregate({
      where: { referrerId: userId, rewardClaimed: true },
      _sum: { rewardAmount: true },
    });
    return { totalReferrals: total, totalRewards: rewards._sum.rewardAmount ?? 0 };
  },
};
