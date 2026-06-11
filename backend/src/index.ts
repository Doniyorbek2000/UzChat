import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { initSocketServer } from "./sockets";
import { startMessageExpiryJob } from "./jobs/messageExpiry";
import { startScheduledMessagesJob } from "./jobs/scheduledMessages";

const app = createApp();
const httpServer = createServer(app);

initSocketServer(httpServer);
startMessageExpiryJob();
startScheduledMessagesJob();

httpServer.listen(env.port, () => {
  console.log(`UzChat backend listening on port ${env.port}`);
});
