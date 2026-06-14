import { chatsService } from "../modules/chats/chats.service";
import { getIo } from "../sockets";

const CHECK_INTERVAL_MS = 10 * 60 * 1000;

export function startChatAutoDeleteJob() {
  setInterval(async () => {
    try {
      const removed = await chatsService.applyInactivityAutoDeletes();
      for (const { userId, conversationId } of removed) {
        getIo().to(`user:${userId}`).emit("conversation:autoDeleted", { conversationId });
      }
    } catch (err) {
      console.error("Chat auto-delete job failed:", err);
    }
  }, CHECK_INTERVAL_MS);
}
