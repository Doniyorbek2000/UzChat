import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";

const BADGE_DEFINITIONS: Record<string, { label: string; icon: string }> = {
  early_adopter: { label: "Birinchi foydalanuvchi", icon: "🌟" },
  social_butterfly: { label: "Ijtimoiy kapalak", icon: "🦋" },
  top_contributor: { label: "Eng faol", icon: "🏆" },
  verified: { label: "Tasdiqlangan", icon: "✅" },
  premium: { label: "Premium", icon: "💎" },
  helper: { label: "Yordamchi", icon: "🤝" },
  creator: { label: "Yaratuvchi", icon: "🎨" },
  streamer: { label: "Strimer", icon: "📡" },
  moderator: { label: "Moderator", icon: "🛡️" },
  influencer: { label: "Ta'sirchi", icon: "⭐" },
};

export const badgesService = {
  async getUserBadges(userId: string) {
    return prisma.userBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: "desc" },
    });
  },

  async awardBadge(userId: string, badge: string) {
    const def = BADGE_DEFINITIONS[badge];
    if (!def) throw Errors.badRequest(`Unknown badge: ${badge}`);

    return prisma.userBadge.upsert({
      where: { userId_badge: { userId, badge } },
      create: { userId, badge, label: def.label, icon: def.icon },
      update: {},
    });
  },

  async revokeBadge(userId: string, badge: string) {
    await prisma.userBadge.deleteMany({ where: { userId, badge } });
  },

  async getAvailableBadges() {
    return Object.entries(BADGE_DEFINITIONS).map(([key, val]) => ({ badge: key, ...val }));
  },
};
