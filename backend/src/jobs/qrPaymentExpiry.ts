import { QrPaymentStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { logger } from "../utils/logger";
import { scheduleExclusiveJob } from "../utils/jobLock";

const INTERVAL_MS = 5 * 60 * 1000;

export function startQrPaymentExpiryJob() {
  const run = async () => {
    try {
      const result = await prisma.qrPayment.updateMany({
        where: { status: QrPaymentStatus.PENDING, expiresAt: { lt: new Date() } },
        data: { status: QrPaymentStatus.EXPIRED },
      });
      if (result.count > 0) {
        logger.info("Expired QR payments", { count: result.count });
      }
    } catch (err) {
      logger.error("QR payment expiry job failed", { error: String(err) });
    }
  };
  scheduleExclusiveJob("qr-payment-expiry", INTERVAL_MS, run, { immediate: true });
}
