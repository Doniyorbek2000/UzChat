import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { initRedis, closeRedis } from "./config/redis";
import { initSocketServer, getIo } from "./sockets";
import { logger } from "./utils/logger";
import { errorTracking } from "./services/errorTracking.service";
import { startMessageExpiryJob } from "./jobs/messageExpiry";
import { startScheduledMessagesJob } from "./jobs/scheduledMessages";
import { startBirthdayReminderJob } from "./jobs/birthdayReminders";
import { startPollDeadlinesJob } from "./jobs/pollDeadlines";
import { startCustomStatusExpiryJob } from "./jobs/customStatusExpiry";
import { startPinExpiryJob } from "./jobs/pinExpiry";
import { startMessageRemindersJob } from "./jobs/messageReminders";
import { startChatAutoDeleteJob } from "./jobs/chatAutoDelete";
import { startAccountSelfDestructJob } from "./jobs/accountSelfDestruct";
import { startMediaGarbageCollectionJob } from "./jobs/mediaGarbageCollection";
import { startSessionCleanupJob } from "./jobs/sessionCleanup";
import { startStoryExpiryJob } from "./jobs/storyExpiry";
import { startChannelStatsJob } from "./jobs/channelStats";
import { startQrPaymentExpiryJob } from "./jobs/qrPaymentExpiry";
import { startNearbyCleanupJob } from "./jobs/nearbyCleanup";
import { startPreKeyCleanupJob } from "./jobs/preKeyCleanup";
import { startRedPacketRefundsJob } from "./jobs/redPacketRefunds";

const app = createApp();
const httpServer = createServer(app);

httpServer.keepAliveTimeout = 65_000;
httpServer.headersTimeout = 66_000;

initRedis().catch((err) => {
  logger.warn("Redis init failed — running without Redis", { error: String(err) });
});

initSocketServer(httpServer);
startMessageExpiryJob();
startScheduledMessagesJob();
startBirthdayReminderJob();
startPollDeadlinesJob();
startCustomStatusExpiryJob();
startPinExpiryJob();
startMessageRemindersJob();
startChatAutoDeleteJob();
startAccountSelfDestructJob();
startMediaGarbageCollectionJob();
startSessionCleanupJob();
startStoryExpiryJob();
startChannelStatsJob();
startQrPaymentExpiryJob();
startNearbyCleanupJob();
startPreKeyCleanupJob();
startRedPacketRefundsJob();

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason: String(reason) });
  errorTracking.captureException(reason);
});
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception — shutting down", { error: err.message, stack: err.stack });
  errorTracking.captureException(err);
  gracefulShutdown("uncaughtException");
});

function gracefulShutdown(signal: string) {
  logger.info("Shutting down", { signal });
  httpServer.close(() => {
    try { getIo().close(); } catch {}
    closeRedis().catch(() => {});
    prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000);
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

async function start() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info("Database connected");
  } catch (err) {
    logger.error("Database connection failed", { error: String(err) });
    process.exit(1);
  }

  httpServer.listen(env.port, () => {
    logger.info("UzChat backend started", { port: env.port, env: env.nodeEnv });
  });
}

start();
