import { RedPacketStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { redPacketsService } from "../modules/redpackets/redpackets.service";
import { logger } from "../utils/logger";

const INTERVAL_MS = 10 * 60 * 1000;

// Returns unclaimed red packet money to the sender once the packet expires.
export function startRedPacketRefundsJob() {
  const run = async () => {
    try {
      const expired = await prisma.redPacket.findMany({
        where: { status: RedPacketStatus.ACTIVE, expiresAt: { lt: new Date() } },
        select: { id: true },
        take: 500,
      });

      for (const packet of expired) {
        await redPacketsService.expireAndRefund(packet.id);
      }

      if (expired.length > 0) {
        logger.info("Refunded expired red packets", { count: expired.length });
      }
    } catch (err) {
      logger.error("Red packet refund job failed", { error: String(err) });
    }
  };
  run();
  setInterval(run, INTERVAL_MS);
}
