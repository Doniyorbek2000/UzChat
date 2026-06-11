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
      const newParticipantId: string = req.body.userId;

      getIo().to(`user:${newParticipantId}`).socketsJoin(`conversation:${conversation.id}`);

      // The new participant needs their own wrapped key, not the requester's.
      const newParticipantView = await chatsService.getConversation(newParticipantId, conversation.id);
      getIo().to(`user:${newParticipantId}`).emit("conversation:new", newParticipantView);
      getIo()
        .to(`conversation:${conversation.id}`)
        .except(`user:${newParticipantId}`)
        .emit("conversation:updated", conversation);

      res.status(201).json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const conversation = await chatsService.updateConversation(req.user!.sub, req.params.id, req.body);
      getIo().to(`conversation:${conversation.id}`).emit("conversation:updated", conversation);
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async updatePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const conversation = await chatsService.updatePreferences(req.user!.sub, req.params.id, req.body);
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async clearHistory(req: Request, res: Response, next: NextFunction) {
    try {
      await chatsService.clearHistory(req.user!.sub, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async setPinnedMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const conversation = await chatsService.setPinnedMessage(req.user!.sub, req.params.id, req.body.messageId);
      getIo().to(`conversation:${conversation.id}`).emit("conversation:updated", conversation);
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async createInviteLink(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await chatsService.createInviteLink(req.user!.sub, req.params.id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async revokeInviteLink(req: Request, res: Response, next: NextFunction) {
    try {
      await chatsService.revokeInviteLink(req.user!.sub, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async getInvitePreview(req: Request, res: Response, next: NextFunction) {
    try {
      const preview = await chatsService.getInvitePreview(req.params.code);
      res.json(preview);
    } catch (err) {
      next(err);
    }
  },

  async joinByInvite(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { conversation, alreadyMember } = await chatsService.joinByInvite(userId, req.params.code, req.body);

      if (!alreadyMember) {
        getIo().to(`user:${userId}`).socketsJoin(`conversation:${conversation.id}`);
        getIo()
          .to(`conversation:${conversation.id}`)
          .except(`user:${userId}`)
          .emit("conversation:updated", conversation);
      }

      res.status(alreadyMember ? 200 : 201).json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async removeParticipant(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, userId } = req.params;
      const conversation = await chatsService.removeParticipant(req.user!.sub, id, userId);

      getIo().to(`conversation:${id}`).emit("conversation:participantRemoved", { conversationId: id, userId });
      getIo().to(`conversation:${id}`).except(`user:${userId}`).emit("conversation:updated", conversation);
      getIo().in(`user:${userId}`).socketsLeave(`conversation:${id}`);

      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async leave(req: Request, res: Response, next: NextFunction) {
    try {
      const conversationId = req.params.id;
      const userId = req.user!.sub;
      const result = await chatsService.leaveConversation(userId, conversationId);

      if (result.deleted) {
        getIo().to(`conversation:${conversationId}`).emit("conversation:deleted", { conversationId });
      } else {
        getIo()
          .to(`conversation:${conversationId}`)
          .emit("conversation:participantRemoved", { conversationId, userId });

        if (result.newOwnerId) {
          const conversation = await chatsService.getConversation(result.newOwnerId, conversationId);
          getIo().to(`conversation:${conversationId}`).emit("conversation:updated", conversation);
        }
      }

      getIo().in(`user:${userId}`).socketsLeave(`conversation:${conversationId}`);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },

  async updateParticipantRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, userId } = req.params;
      const conversation = await chatsService.updateParticipantRole(req.user!.sub, id, userId, req.body.role);
      getIo().to(`conversation:${id}`).emit("conversation:updated", conversation);
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },
};
