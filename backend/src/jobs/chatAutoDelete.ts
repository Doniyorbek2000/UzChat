import { chatsService } from "../modules/chats/chats.service";
import { getIo } from "../sockets";
import { logger } from "../utils/logger";

const CHECK_INTERVAL_MS = 10 * 60 * 1000;

export function startChatAutoDeleteJob() {
  setInterval(async () => {
    try {
      const removed = await chatsService.applyInactivityAutoDeletes();
      for (const { userId, conversationId } of removed) {
        getIo().to(`user:${userId}`).emit("conversation:autoDeleted", { conversationId });
      }
    } catch (err) {
      logger.error("Chat auto-delete job failed", { error: String(err) });
    }
  }, CHECK_INTERVAL_MS);
}
