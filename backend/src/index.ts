import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { initSocketServer } from "./sockets";
import { startMessageExpiryJob } from "./jobs/messageExpiry";

const app = createApp();
const httpServer = createServer(app);

initSocketServer(httpServer);
startMessageExpiryJob();

httpServer.listen(env.port, () => {
  console.log(`UzChat backend listening on port ${env.port}`);
});
