import { prisma } from "../config/prisma";
import { OTP_TTL_MS } from "../utils/otp";
import { logger } from "../utils/logger";

const INTERVAL_MS = 6 * 60 * 60 * 1000;

export function startSessionCleanupJob() {
  const run = async () => {
    try {
      const [sessions, otps] = await Promise.all([
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
      ]);
      const total = sessions.count + otps.count;
      if (total > 0) logger.info("Session cleanup completed", { tokens: sessions.count, otps: otps.count });
    } catch (err) {
      logger.error("Session cleanup job failed", { error: String(err) });
    }
  };
  run();
  setInterval(run, INTERVAL_MS);
}
