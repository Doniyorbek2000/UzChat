import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { initSocketServer, getIo } from "./sockets";
import { logger } from "./utils/logger";
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

const app = createApp();
const httpServer = createServer(app);

httpServer.keepAliveTimeout = 65_000;
httpServer.headersTimeout = 66_000;

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

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", { reason: String(reason) });
});
process.on("uncaughtException", (err) => {
  logger.error("Uncaught exception — shutting down", { error: err.message, stack: err.stack });
  gracefulShutdown("uncaughtException");
});

function gracefulShutdown(signal: string) {
  logger.info("Shutting down", { signal });
  httpServer.close(() => {
    try { getIo().close(); } catch {}
    prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000);
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

httpServer.listen(env.port, () => {
  logger.info("UzChat backend started", { port: env.port });
});
