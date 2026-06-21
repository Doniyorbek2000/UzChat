import { Request, Response } from "express";
import { messagesService } from "./messages.service";
import {
  sendMessageSchema,
  listMessagesQuerySchema,
  editMessageSchema,
  setReactionSchema,
  votePollSchema,
  setReminderSchema,
  rescheduleMessageSchema,
} from "./messages.schema";
import { markReadSchema } from "../chats/chats.schema";
import { getIo } from "../../sockets";

export const messagesController = {
  async send(req: Request, res: Response) {
    const input = sendMessageSchema.parse(req.body);
    const message = await messagesService.sendMessage(req.user!.sub, req.params.id, input);
    if (!message.scheduledFor) {
      getIo().to(`conversation:${req.params.id}`).emit("message:new", message);
    }
    res.status(201).json(message);
  },

  async list(req: Request, res: Response) {
    const query = listMessagesQuerySchema.parse(req.query);
    const messages = await messagesService.listMessages(req.user!.sub, req.params.id, query);
    res.json(messages);
  },

  async listMedia(req: Request, res: Response) {
    const query = listMessagesQuerySchema.parse(req.query);
    const messages = await messagesService.listMedia(req.user!.sub, req.params.id, query);
    res.json(messages);
  },

  async getStats(req: Request, res: Response) {
    const stats = await messagesService.getStats(req.user!.sub, req.params.id);
    res.json(stats);
  },

  async getMyActivityStats(req: Request, res: Response) {
    const stats = await messagesService.getMyActivityStats(req.user!.sub);
    res.json(stats);
  },

  async markRead(req: Request, res: Response) {
    const { upToMessageId } = markReadSchema.parse(req.body);
    await messagesService.markRead(req.user!.sub, req.params.id, upToMessageId);
    res.status(204).send();
  },

  async remove(req: Request, res: Response) {
    const message = await messagesService.deleteMessage(req.user!.sub, req.params.id, req.params.messageId);
    getIo().to(`conversation:${req.params.id}`).emit("message:deleted", message);
    res.json(message);
  },

  async hideForMe(req: Request, res: Response) {
    await messagesService.hideMessageForMe(req.user!.sub, req.params.id, req.params.messageId);
    res.status(204).send();
  },

  async view(req: Request, res: Response) {
    const { id: conversationId, messageId } = req.params;
    const message = await messagesService.viewMessage(req.user!.sub, conversationId, messageId);
    getIo().to(`conversation:${conversationId}`).emit("message:viewed", {
      conversationId,
      messageId,
      viewedAt: message.viewedAt,
    });
    res.json(message);
  },

  async edit(req: Request, res: Response) {
    const { id: conversationId, messageId } = req.params;
    const input = editMessageSchema.parse(req.body);
    const message = await messagesService.editMessage(req.user!.sub, conversationId, messageId, input);
    getIo().to(`conversation:${conversationId}`).emit("message:edited", message);
    res.json(message);
  },

  async getEditHistory(req: Request, res: Response) {
    const { id: conversationId, messageId } = req.params;
    const history = await messagesService.getEditHistory(req.user!.sub, conversationId, messageId);
    res.json(history);
  },

  async setReaction(req: Request, res: Response) {
    const { id: conversationId, messageId } = req.params;
    const { emoji } = setReactionSchema.parse(req.body);
    const reactions = await messagesService.setReaction(req.user!.sub, conversationId, messageId, emoji);
    getIo().to(`conversation:${conversationId}`).emit("message:reaction", { conversationId, messageId, reactions });
    res.json({ messageId, reactions });
  },

  async votePoll(req: Request, res: Response) {
    const { id: conversationId, messageId } = req.params;
    const { optionIds } = votePollSchema.parse(req.body);
    const { responseVotes, broadcastVotes } = await messagesService.votePoll(
      req.user!.sub,
      conversationId,
      messageId,
      optionIds
    );
    getIo()
      .to(`conversation:${conversationId}`)
      .emit("message:pollVote", { conversationId, messageId, votes: broadcastVotes });
    res.json({ messageId, votes: responseVotes });
  },

  async closePoll(req: Request, res: Response) {
    const { id: conversationId, messageId } = req.params;
    const pollClosedAt = await messagesService.closePoll(req.user!.sub, conversationId, messageId);
    getIo()
      .to(`conversation:${conversationId}`)
      .emit("message:pollClosed", { conversationId, messageId, pollClosedAt });
    res.json({ messageId, pollClosedAt });
  },

  async toggleStar(req: Request, res: Response) {
    const { id: conversationId, messageId } = req.params;
    const result = await messagesService.toggleStar(req.user!.sub, conversationId, messageId);
    res.json(result);
  },

  async listStarred(req: Request, res: Response) {
    const messages = await messagesService.listStarred(req.user!.sub);
    res.json(messages);
  },

  async setReminder(req: Request, res: Response) {
    const { id: conversationId, messageId } = req.params;
    const input = setReminderSchema.parse(req.body);
    const result = await messagesService.setReminder(req.user!.sub, conversationId, messageId, input);
    res.json(result);
  },

  async cancelReminder(req: Request, res: Response) {
    const { id: conversationId, messageId } = req.params;
    await messagesService.cancelReminder(req.user!.sub, conversationId, messageId);
    res.status(204).send();
  },

  async listReminders(req: Request, res: Response) {
    const reminders = await messagesService.listReminders(req.user!.sub);
    res.json(reminders);
  },

  async listMentions(req: Request, res: Response) {
    const messages = await messagesService.listMentions(req.user!.sub);
    res.json(messages);
  },

  async listScheduled(req: Request, res: Response) {
    const messages = await messagesService.listScheduledMessages(req.user!.sub, req.params.id);
    res.json(messages);
  },

  async cancelScheduled(req: Request, res: Response) {
    await messagesService.cancelScheduledMessage(req.user!.sub, req.params.id, req.params.messageId);
    res.status(204).send();
  },

  async rescheduleScheduled(req: Request, res: Response) {
    const { scheduledFor } = rescheduleMessageSchema.parse(req.body);
    const message = await messagesService.rescheduleMessage(
      req.user!.sub,
      req.params.id,
      req.params.messageId,
      scheduledFor
    );
    res.json(message);
  },

  async sendScheduledNow(req: Request, res: Response) {
    const message = await messagesService.sendScheduledNow(req.user!.sub, req.params.id, req.params.messageId);
    getIo().to(`conversation:${req.params.id}`).emit("message:new", message);
    res.json(message);
  },
};
