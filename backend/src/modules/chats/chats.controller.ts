import { Request, Response, NextFunction } from "express";
import { chatsService } from "./chats.service";
import { getIo } from "../../sockets";

export const chatsController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const conversation = await chatsService.createConversation(req.user!.sub, req.body);
      for (const participant of conversation.participants) {
        getIo().to(`user:${participant.userId}`).socketsJoin(`conversation:${conversation.id}`);
      }
      getIo().to(`conversation:${conversation.id}`).emit("conversation:new", conversation);
      res.status(201).json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const conversations = await chatsService.listConversations(req.user!.sub);
      res.json(conversations);
    } catch (err) {
      next(err);
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const conversation = await chatsService.getConversation(req.user!.sub, req.params.id);
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async addParticipant(req: Request, res: Response, next: NextFunction) {
    try {
      const conversation = await chatsService.addParticipant(req.user!.sub, req.params.id, req.body);
      getIo().to(`user:${req.body.userId}`).socketsJoin(`conversation:${conversation.id}`);
      getIo().to(`conversation:${conversation.id}`).emit("conversation:updated", conversation);
      res.status(201).json(conversation);
    } catch (err) {
      next(err);
    }
  },
};
