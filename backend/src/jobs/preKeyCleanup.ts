import { prisma } from "../config/prisma";
import { logger } from "../utils/logger";
import { scheduleExclusiveJob } from "../utils/jobLock";

const INTERVAL_MS = 12 * 60 * 60 * 1000;

const STALE_DEVICE_DAYS = 180;
const MAX_PREKEYS_PER_DEVICE = 200;
const TRANSPARENCY_LOG_RETENTION_DAYS = 365;

export function startPreKeyCleanupJob() {
  const run = async () => {
    try {
      const staleDate = new Date(Date.now() - STALE_DEVICE_DAYS * 24 * 60 * 60 * 1000);
      const logRetentionDate = new Date(Date.now() - TRANSPARENCY_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000);

      const staleDevices = await prisma.deviceKey.findMany({
        where: { createdAt: { lt: staleDate } },
        select: { id: true, userId: true, deviceId: true },
      });

      let removedDevices = 0;
      for (const device of staleDevices) {
        const hasRecentSession = await prisma.e2eeSession.findFirst({
          where: { ownerDeviceKeyId: device.id },
        });
        if (hasRecentSession) continue;

        await prisma.$transaction([
          prisma.preKey.deleteMany({ where: { deviceKeyId: device.id } }),
          prisma.signedPreKey.deleteMany({ where: { deviceKeyId: device.id } }),
          prisma.senderKeyStore.deleteMany({ where: { deviceKeyId: device.id } }),
          prisma.deviceKey.delete({ where: { id: device.id } }),
        ]);

        await prisma.keyTransparencyLog.create({
          data: {
            userId: device.userId,
            deviceId: device.deviceId,
            publicKey: "",
            action: "REMOVE",
            serverSig: "auto-cleanup",
          },
        });

        removedDevices++;
      }

      const devicesWithExcess = await prisma.deviceKey.findMany({
        where: {
          preKeys: { some: {} },
        },
        select: {
          id: true,
          _count: { select: { preKeys: true } },
        },
      });

      let trimmedPreKeys = 0;
      for (const device of devicesWithExcess) {
        if (device._count.preKeys <= MAX_PREKEYS_PER_DEVICE) continue;

        const excess = device._count.preKeys - MAX_PREKEYS_PER_DEVICE;
        const oldestKeys = await prisma.preKey.findMany({
          where: { deviceKeyId: device.id },
          orderBy: { keyId: "asc" },
          take: excess,
          select: { id: true },
        });

        if (oldestKeys.length > 0) {
          await prisma.preKey.deleteMany({
            where: { id: { in: oldestKeys.map((k) => k.id) } },
          });
          trimmedPreKeys += oldestKeys.length;
        }
      }

      const oldLogs = await prisma.keyTransparencyLog.deleteMany({
        where: { createdAt: { lt: logRetentionDate } },
      });

      if (removedDevices > 0 || trimmedPreKeys > 0 || oldLogs.count > 0) {
        logger.info("PreKey cleanup completed", {
          removedDevices,
          trimmedPreKeys,
          oldTransparencyLogs: oldLogs.count,
        });
      }
    } catch (err) {
      logger.error("PreKey cleanup job failed", { error: String(err) });
    }
  };

  setTimeout(run, 60_000);
  scheduleExclusiveJob("prekey-cleanup", INTERVAL_MS, run);
}
