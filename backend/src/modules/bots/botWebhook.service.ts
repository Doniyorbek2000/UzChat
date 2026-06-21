import { prisma } from "../../config/prisma";
import { logger } from "../../utils/logger";

interface WebhookPayload {
  updateId: string;
  type: "message" | "command" | "inline_query";
  from: { id: string; username: string; displayName: string };
  conversationId?: string;
  text?: string;
  command?: string;
  args?: string;
}

export const botWebhookService = {
  async deliverUpdate(botUsername: string, payload: WebhookPayload) {
    const bot = await prisma.bot.findUnique({
      where: { username: botUsername },
      select: { id: true, webhookUrl: true, isActive: true, token: true },
    });

    if (!bot || !bot.isActive || !bot.webhookUrl) return;

    try {
      const response = await fetch(bot.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Bot-Token": bot.token,
          "X-Bot-Id": bot.id,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        logger.warn("Bot webhook delivery failed", {
          botId: bot.id,
          status: response.status,
          updateId: payload.updateId,
        });
      }
    } catch (err) {
      logger.error("Bot webhook delivery error", {
        botId: bot.id,
        error: String(err),
        updateId: payload.updateId,
      });
    }
  },

  async processCommand(
    botUsername: string,
    command: string,
    args: string,
    from: { id: string; username: string; displayName: string },
    conversationId: string
  ) {
    const bot = await prisma.bot.findUnique({
      where: { username: botUsername },
      include: { commands: true },
    });

    if (!bot || !bot.isActive) return null;

    const cmd = bot.commands.find((c) => c.command === command);
    if (!cmd) return null;

    await this.deliverUpdate(botUsername, {
      updateId: `cmd_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type: "command",
      from,
      conversationId,
      command,
      args,
    });

    return cmd;
  },
};
