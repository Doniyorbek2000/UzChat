import { messagesService } from "../modules/messages/messages.service";
import { getIo } from "../sockets";
import { logger } from "../utils/logger";
import { scheduleExclusiveJob } from "../utils/jobLock";

const CHECK_INTERVAL_MS = 10 * 1000;

export function startPollDeadlinesJob() {
  scheduleExclusiveJob("poll-deadlines", CHECK_INTERVAL_MS, async () => {
    try {
      const closed = await messagesService.closeDuePolls();
      for (const message of closed) {
        getIo()
          .to(`conversation:${message.conversationId}`)
          .emit("message:pollClosed", {
            conversationId: message.conversationId,
            messageId: message.id,
            pollClosedAt: message.pollClosedAt,
          });
      }
    } catch (err) {
      logger.error("Poll deadlines job failed", { error: String(err) });
    }
  });
}
