import { prisma } from "../config/prisma";
import { OTP_TTL_MS } from "../utils/otp";

const INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

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
      if (total > 0) console.log(`Session cleanup: removed ${sessions.count} token(s), ${otps.count} OTP(s)`);
    } catch (err) {
      console.error("Session cleanup job failed:", err);
    }
  };
  run();
  setInterval(run, INTERVAL_MS);
}
