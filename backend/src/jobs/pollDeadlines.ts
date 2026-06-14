import { messagesService } from "../modules/messages/messages.service";
import { getIo } from "../sockets";

const CHECK_INTERVAL_MS = 10 * 1000;

export function startPollDeadlinesJob() {
  setInterval(async () => {
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
      console.error("Poll deadlines job failed:", err);
    }
  }, CHECK_INTERVAL_MS);
}
