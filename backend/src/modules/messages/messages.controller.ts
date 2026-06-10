import { Request, Response, NextFunction } from "express";
import { messagesService } from "./messages.service";
import { listMessagesQuerySchema } from "./messages.schema";
import { getIo } from "../../sockets";

export const messagesController = {
  async send(req: Request, res: Response, next: NextFunction) {
    try {
      const message = await messagesService.sendMessage(req.user!.sub, req.params.id, req.body);
      getIo().to(`conversation:${req.params.id}`).emit("message:new", message);
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

  async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      await messagesService.markRead(req.user!.sub, req.params.id);
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
};
