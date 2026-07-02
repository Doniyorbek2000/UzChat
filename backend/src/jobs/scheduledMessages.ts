import { messagesService } from "../modules/messages/messages.service";
import { getIo } from "../sockets";
import { logger } from "../utils/logger";
import { scheduleExclusiveJob } from "../utils/jobLock";

const CHECK_INTERVAL_MS = 10 * 1000;

export function startScheduledMessagesJob() {
  scheduleExclusiveJob("scheduled-messages", CHECK_INTERVAL_MS, async () => {
    try {
      const published = await messagesService.publishDueScheduledMessages();
      for (const message of published) {
        getIo().to(`conversation:${message.conversationId}`).emit("message:new", message);
      }
    } catch (err) {
      logger.error("Scheduled messages job failed", { error: String(err) });
    }
  });
}
