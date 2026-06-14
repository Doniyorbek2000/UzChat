import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { initSocketServer } from "./sockets";
import { startMessageExpiryJob } from "./jobs/messageExpiry";
import { startScheduledMessagesJob } from "./jobs/scheduledMessages";
import { startBirthdayReminderJob } from "./jobs/birthdayReminders";
import { startPollDeadlinesJob } from "./jobs/pollDeadlines";

const app = createApp();
const httpServer = createServer(app);

initSocketServer(httpServer);
startMessageExpiryJob();
startScheduledMessagesJob();
startBirthdayReminderJob();
startPollDeadlinesJob();

httpServer.listen(env.port, () => {
  console.log(`UzChat backend listening on port ${env.port}`);
});
