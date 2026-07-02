import { chatsService } from "../modules/chats/chats.service";
import { getIo } from "../sockets";
import { logger } from "../utils/logger";
import { scheduleExclusiveJob } from "../utils/jobLock";

const CHECK_INTERVAL_MS = 10 * 60 * 1000;

export function startChatAutoDeleteJob() {
  scheduleExclusiveJob("chat-auto-delete", CHECK_INTERVAL_MS, async () => {
    try {
      const removed = await chatsService.applyInactivityAutoDeletes();
      for (const { userId, conversationId } of removed) {
        getIo().to(`user:${userId}`).emit("conversation:autoDeleted", { conversationId });
      }
    } catch (err) {
      logger.error("Chat auto-delete job failed", { error: String(err) });
    }
  });
}
