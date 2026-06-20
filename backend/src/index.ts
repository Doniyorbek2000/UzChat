import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { initSocketServer, getIo } from "./sockets";
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

const app = createApp();
const httpServer = createServer(app);

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

function gracefulShutdown(signal: string) {
  console.log(`${signal} received — shutting down`);
  httpServer.close(() => {
    try { getIo().close(); } catch {}
    prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000);
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

httpServer.listen(env.port, () => {
  console.log(`UzChat backend listening on port ${env.port}`);
});
