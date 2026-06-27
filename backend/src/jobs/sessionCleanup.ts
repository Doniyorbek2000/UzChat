import { prisma } from "../config/prisma";
import { OTP_TTL_MS } from "../utils/otp";
import { logger } from "../utils/logger";

const INTERVAL_MS = 6 * 60 * 60 * 1000;

export function startSessionCleanupJob() {
  const run = async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const [sessions, otps, loginAttempts, notifications, lockedUsers] = await Promise.all([
        prisma.refreshToken.deleteMany({
          where: {
            OR: [
              { expiresAt: { lt: new Date() } },
              { revokedAt: { not: null } },
            ],
          },
        }),
        prisma.otpCode.deleteMany({
          where: { createdAt: { lt: new Date(Date.now() - OTP_TTL_MS) } },
        }),
        prisma.loginAttempt.deleteMany({
          where: { createdAt: { lt: thirtyDaysAgo } },
        }),
        prisma.notificationLog.deleteMany({
          where: { createdAt: { lt: ninetyDaysAgo }, isRead: true },
        }),
        prisma.user.updateMany({
          where: { lockedUntil: { lt: new Date() } },
          data: { failedLoginAttempts: 0, lockedUntil: null },
        }),
      ]);
      const total = sessions.count + otps.count + loginAttempts.count + notifications.count;
      if (total > 0 || lockedUsers.count > 0) {
        logger.info("Session cleanup completed", {
          tokens: sessions.count,
          otps: otps.count,
          loginAttempts: loginAttempts.count,
          notifications: notifications.count,
          unlockedUsers: lockedUsers.count,
        });
      }
    } catch (err) {
      logger.error("Session cleanup job failed", { error: String(err) });
    }
  };
  run();
  setInterval(run, INTERVAL_MS);
}
