import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { loyaltyService } from "../loyalty/loyalty.service";

const userSelect = { id: true, displayName: true, username: true, avatarUrl: true };

// Loyalty points granted when a referral is claimed.
const REFERRER_REWARD_POINTS = 500;
const REFERRED_REWARD_POINTS = 200;

export const referralsService = {
  // Returns the user's stable referral code, creating it on first request.
  async generateCode(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
    if (!user) throw Errors.notFound("Foydalanuvchi");
    if (user.referralCode) return { code: user.referralCode, userId };

    // Retry on the (unlikely) unique collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = `UZ${randomBytes(4).toString("hex").toUpperCase()}`;
      try {
        await prisma.user.update({ where: { id: userId }, data: { referralCode: code } });
        return { code, userId };
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
        throw err;
      }
    }
    throw Errors.conflict("Referal kod yaratib bo'lmadi, qayta urinib ko'ring");
  },

  async claimReferral(referredId: string, code: string) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: code.trim().toUpperCase() },
      select: { id: true },
    });
    if (!referrer) throw Errors.notFound("Bunday referal kod");
    if (referrer.id === referredId) throw Errors.badRequest("O'z kodingizni kirita olmaysiz");

    const alreadyReferred = await prisma.referral.findFirst({ where: { referredId } });
    if (alreadyReferred) throw Errors.badRequest("Siz allaqachon referal kod kiritgansiz");

    const referral = await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        referredId,
        code: code.trim().toUpperCase(),
        rewardAmount: REFERRER_REWARD_POINTS,
        rewardClaimed: true,
      },
      include: { referrer: { select: userSelect }, referred: { select: userSelect } },
    });

    // Both sides earn loyalty points; failures here must not undo the referral.
    await loyaltyService
      .addPoints(referrer.id, REFERRER_REWARD_POINTS, "earn", "Do'st taklif qilish mukofoti")
      .catch(() => {});
    await loyaltyService
      .addPoints(referredId, REFERRED_REWARD_POINTS, "earn", "Referal kod bilan qo'shilish bonusi")
      .catch(() => {});

    return referral;
  },

  async getMyReferrals(userId: string) {
    return prisma.referral.findMany({
      where: { referrerId: userId },
      include: { referred: { select: userSelect } },
      orderBy: { createdAt: "desc" },
      take: 100,
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
