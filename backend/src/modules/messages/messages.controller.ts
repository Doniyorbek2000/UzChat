import { Request, Response, NextFunction } from "express";
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
  async send(req: Request, res: Response, next: NextFunction) {
    try {
      const input = sendMessageSchema.parse(req.body);
      const message = await messagesService.sendMessage(req.user!.sub, req.params.id, input);
      if (!message.scheduledFor) {
        getIo().to(`conversation:${req.params.id}`).emit("message:new", message);
      }
      res.status(201).json(message);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listMessagesQuerySchema.parse(req.query);
      const messages = await messagesService.listMessages(req.user!.sub, req.params.id, query);
      res.json(messages);
    } catch (err) {
      next(err);
    }
  },

  async listMedia(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listMessagesQuerySchema.parse(req.query);
      const messages = await messagesService.listMedia(req.user!.sub, req.params.id, query);
      res.json(messages);
    } catch (err) {
      next(err);
    }
  },

  async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await messagesService.getStats(req.user!.sub, req.params.id);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  },

  async getMyActivityStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await messagesService.getMyActivityStats(req.user!.sub);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  },

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { upToMessageId } = markReadSchema.parse(req.body);
      await messagesService.markRead(req.user!.sub, req.params.id, upToMessageId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const message = await messagesService.deleteMessage(req.user!.sub, req.params.id, req.params.messageId);
      getIo().to(`conversation:${req.params.id}`).emit("message:deleted", message);
      res.json(message);
    } catch (err) {
      next(err);
    }
  },

  async hideForMe(req: Request, res: Response, next: NextFunction) {
    try {
      await messagesService.hideMessageForMe(req.user!.sub, req.params.id, req.params.messageId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async view(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: conversationId, messageId } = req.params;
      const message = await messagesService.viewMessage(req.user!.sub, conversationId, messageId);
      getIo().to(`conversation:${conversationId}`).emit("message:viewed", {
        conversationId,
        messageId,
        viewedAt: message.viewedAt,
      });
      res.json(message);
    } catch (err) {
      next(err);
    }
  },

  async edit(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: conversationId, messageId } = req.params;
      const input = editMessageSchema.parse(req.body);
      const message = await messagesService.editMessage(req.user!.sub, conversationId, messageId, input);
      getIo().to(`conversation:${conversationId}`).emit("message:edited", message);
      res.json(message);
    } catch (err) {
      next(err);
    }
  },

  async getEditHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: conversationId, messageId } = req.params;
      const history = await messagesService.getEditHistory(req.user!.sub, conversationId, messageId);
      res.json(history);
    } catch (err) {
      next(err);
    }
  },

  async setReaction(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: conversationId, messageId } = req.params;
      const { emoji } = setReactionSchema.parse(req.body);
      const reactions = await messagesService.setReaction(req.user!.sub, conversationId, messageId, emoji);
      getIo().to(`conversation:${conversationId}`).emit("message:reaction", { conversationId, messageId, reactions });
      res.json({ messageId, reactions });
    } catch (err) {
      next(err);
    }
  },

  async votePoll(req: Request, res: Response, next: NextFunction) {
    try {
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
    } catch (err) {
      next(err);
    }
  },

  async closePoll(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: conversationId, messageId } = req.params;
      const pollClosedAt = await messagesService.closePoll(req.user!.sub, conversationId, messageId);
      getIo()
        .to(`conversation:${conversationId}`)
        .emit("message:pollClosed", { conversationId, messageId, pollClosedAt });
      res.json({ messageId, pollClosedAt });
    } catch (err) {
      next(err);
    }
  },

  async toggleStar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: conversationId, messageId } = req.params;
      const result = await messagesService.toggleStar(req.user!.sub, conversationId, messageId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async listStarred(req: Request, res: Response, next: NextFunction) {
    try {
      const messages = await messagesService.listStarred(req.user!.sub);
      res.json(messages);
    } catch (err) {
      next(err);
    }
  },

  async setReminder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: conversationId, messageId } = req.params;
      const input = setReminderSchema.parse(req.body);
      const result = await messagesService.setReminder(req.user!.sub, conversationId, messageId, input);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async cancelReminder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: conversationId, messageId } = req.params;
      await messagesService.cancelReminder(req.user!.sub, conversationId, messageId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async listReminders(req: Request, res: Response, next: NextFunction) {
    try {
      const reminders = await messagesService.listReminders(req.user!.sub);
      res.json(reminders);
    } catch (err) {
      next(err);
    }
  },

  async listMentions(req: Request, res: Response, next: NextFunction) {
    try {
      const messages = await messagesService.listMentions(req.user!.sub);
      res.json(messages);
    } catch (err) {
      next(err);
    }
  },

  async listScheduled(req: Request, res: Response, next: NextFunction) {
    try {
      const messages = await messagesService.listScheduledMessages(req.user!.sub, req.params.id);
      res.json(messages);
    } catch (err) {
      next(err);
    }
  },

  async cancelScheduled(req: Request, res: Response, next: NextFunction) {
    try {
      await messagesService.cancelScheduledMessage(req.user!.sub, req.params.id, req.params.messageId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async rescheduleScheduled(req: Request, res: Response, next: NextFunction) {
    try {
      const { scheduledFor } = rescheduleMessageSchema.parse(req.body);
      const message = await messagesService.rescheduleMessage(
        req.user!.sub,
        req.params.id,
        req.params.messageId,
        scheduledFor
      );
      res.json(message);
    } catch (err) {
      next(err);
    }
  },

  async sendScheduledNow(req: Request, res: Response, next: NextFunction) {
    try {
      const message = await messagesService.sendScheduledNow(req.user!.sub, req.params.id, req.params.messageId);
      getIo().to(`conversation:${req.params.id}`).emit("message:new", message);
      res.json(message);
    } catch (err) {
      next(err);
    }
  },
};
