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
      const { conversation, systemMessages } = await chatsService.addParticipant(req.user!.sub, req.params.id, req.body);
      const newParticipantId: string = req.body.userId;

      getIo().to(`user:${newParticipantId}`).socketsJoin(`conversation:${conversation.id}`);

      // The new participant needs their own wrapped key, not the requester's.
      const newParticipantView = await chatsService.getConversation(newParticipantId, conversation.id);
      getIo().to(`user:${newParticipantId}`).emit("conversation:new", newParticipantView);
      getIo()
        .to(`conversation:${conversation.id}`)
        .except(`user:${newParticipantId}`)
        .emit("conversation:updated", conversation);
      for (const systemMessage of systemMessages) {
        getIo().to(`conversation:${conversation.id}`).emit("message:new", systemMessage);
      }

      res.status(201).json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversation, systemMessages } = await chatsService.updateConversation(req.user!.sub, req.params.id, req.body);
      getIo().to(`conversation:${conversation.id}`).emit("conversation:updated", conversation);
      for (const systemMessage of systemMessages) {
        getIo().to(`conversation:${conversation.id}`).emit("message:new", systemMessage);
      }
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

  async reorderPinned(req: Request, res: Response, next: NextFunction) {
    try {
      const conversations = await chatsService.reorderPinned(req.user!.sub, req.params.id, req.body.direction);
      res.json(conversations);
    } catch (err) {
      next(err);
    }
  },

  async clearHistory(req: Request, res: Response, next: NextFunction) {
    try {
      await chatsService.clearHistory(req.user!.sub, req.params.id, req.body.olderThanDays);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async deleteConversation(req: Request, res: Response, next: NextFunction) {
    try {
      await chatsService.deleteConversation(req.user!.sub, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async deleteConversationForEveryone(req: Request, res: Response, next: NextFunction) {
    try {
      const conversationId = req.params.id;
      await chatsService.deleteConversationForEveryone(req.user!.sub, conversationId);
      getIo().to(`conversation:${conversationId}`).emit("conversation:deleted", { conversationId });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async listCommonGroups(req: Request, res: Response, next: NextFunction) {
    try {
      const groups = await chatsService.listCommonGroups(req.user!.sub, req.params.userId);
      res.json(groups);
    } catch (err) {
      next(err);
    }
  },

  async pinMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversation, systemMessage } = await chatsService.pinMessage(
        req.user!.sub,
        req.params.id,
        req.params.messageId,
        req.body
      );
      getIo().to(`conversation:${conversation.id}`).emit("conversation:updated", conversation);
      if (systemMessage) getIo().to(`conversation:${conversation.id}`).emit("message:new", systemMessage);
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async unpinMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const conversation = await chatsService.unpinMessage(req.user!.sub, req.params.id, req.params.messageId);
      getIo().to(`conversation:${conversation.id}`).emit("conversation:updated", conversation);
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async unpinAllMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const conversation = await chatsService.unpinAllMessages(req.user!.sub, req.params.id);
      getIo().to(`conversation:${conversation.id}`).emit("conversation:updated", conversation);
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async setDisappearingMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversation, systemMessage } = await chatsService.setDisappearingMessages(
        req.user!.sub,
        req.params.id,
        req.body.disappearingSeconds
      );
      getIo().to(`conversation:${conversation.id}`).emit("conversation:updated", conversation);
      if (systemMessage) getIo().to(`conversation:${conversation.id}`).emit("message:new", systemMessage);
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async setNoForwards(req: Request, res: Response, next: NextFunction) {
    try {
      const { conversation, systemMessage } = await chatsService.setNoForwards(
        req.user!.sub,
        req.params.id,
        req.body.noForwards
      );
      getIo().to(`conversation:${conversation.id}`).emit("conversation:updated", conversation);
      if (systemMessage) getIo().to(`conversation:${conversation.id}`).emit("message:new", systemMessage);
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async createInviteLink(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await chatsService.createInviteLink(req.user!.sub, req.params.id, req.body);
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
      const result = await chatsService.joinByInvite(userId, req.params.code, req.body);

      if (result.pending) {
        getIo()
          .to(result.managerIds.map((id) => `user:${id}`))
          .emit("conversation:joinRequest", { conversationId: result.conversationId });
        res.status(202).json({ pending: true });
        return;
      }

      const { conversation, alreadyMember, systemMessages } = result;
      if (!alreadyMember) {
        getIo().to(`user:${userId}`).socketsJoin(`conversation:${conversation.id}`);
        getIo()
          .to(`conversation:${conversation.id}`)
          .except(`user:${userId}`)
          .emit("conversation:updated", conversation);
        for (const systemMessage of systemMessages) {
          getIo().to(`conversation:${conversation.id}`).emit("message:new", systemMessage);
        }
      }

      res.status(alreadyMember ? 200 : 201).json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async listJoinRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const requests = await chatsService.listJoinRequests(req.user!.sub, req.params.id);
      res.json(requests);
    } catch (err) {
      next(err);
    }
  },

  async getAuditLog(req: Request, res: Response, next: NextFunction) {
    try {
      const { before } = req.query;
      const entries = await chatsService.getAuditLog(req.user!.sub, req.params.id, before as string | undefined);
      res.json(entries);
    } catch (err) {
      next(err);
    }
  },

  async approveJoinRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, requestId } = req.params;
      const { conversation, systemMessages, newParticipantId } = await chatsService.approveJoinRequest(
        req.user!.sub,
        id,
        requestId
      );

      getIo().to(`user:${newParticipantId}`).socketsJoin(`conversation:${conversation.id}`);

      const newParticipantView = await chatsService.getConversation(newParticipantId, conversation.id);
      getIo().to(`user:${newParticipantId}`).emit("conversation:new", newParticipantView);
      getIo()
        .to(`conversation:${conversation.id}`)
        .except(`user:${newParticipantId}`)
        .emit("conversation:updated", conversation);
      for (const systemMessage of systemMessages) {
        getIo().to(`conversation:${conversation.id}`).emit("message:new", systemMessage);
      }

      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async declineJoinRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, requestId } = req.params;
      await chatsService.declineJoinRequest(req.user!.sub, id, requestId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async listMyJoinRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const requests = await chatsService.listMyJoinRequests(req.user!.sub);
      res.json(requests);
    } catch (err) {
      next(err);
    }
  },

  async cancelMyJoinRequest(req: Request, res: Response, next: NextFunction) {
    try {
      await chatsService.cancelMyJoinRequest(req.user!.sub, req.params.requestId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async removeParticipant(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, userId } = req.params;
      const { conversation, systemMessage } = await chatsService.removeParticipant(req.user!.sub, id, userId);

      getIo().to(`conversation:${id}`).emit("conversation:participantRemoved", { conversationId: id, userId });
      getIo().to(`conversation:${id}`).except(`user:${userId}`).emit("conversation:updated", conversation);
      getIo().to(`conversation:${id}`).except(`user:${userId}`).emit("message:new", systemMessage);
      getIo().in(`user:${userId}`).socketsLeave(`conversation:${id}`);

      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async banParticipant(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, userId } = req.params;
      const { conversation, systemMessage } = await chatsService.removeParticipant(req.user!.sub, id, userId, true);

      getIo().to(`conversation:${id}`).emit("conversation:participantRemoved", { conversationId: id, userId });
      getIo().to(`conversation:${id}`).except(`user:${userId}`).emit("conversation:updated", conversation);
      getIo().to(`conversation:${id}`).except(`user:${userId}`).emit("message:new", systemMessage);
      getIo().in(`user:${userId}`).socketsLeave(`conversation:${id}`);

      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async listBannedUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const bans = await chatsService.listBannedUsers(req.user!.sub, req.params.id);
      res.json(bans);
    } catch (err) {
      next(err);
    }
  },

  async banUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const ban = await chatsService.banUserById(req.user!.sub, req.params.id, req.body);
      res.status(201).json(ban);
    } catch (err) {
      next(err);
    }
  },

  async unbanUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, userId } = req.params;
      await chatsService.unbanUser(req.user!.sub, id, userId);
      res.status(204).send();
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
        getIo().to(`conversation:${conversationId}`).emit("message:new", result.systemMessage);

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
      const { conversation, systemMessage } = await chatsService.updateParticipantRole(req.user!.sub, id, userId, req.body.role);
      getIo().to(`conversation:${id}`).emit("conversation:updated", conversation);
      getIo().to(`conversation:${id}`).emit("message:new", systemMessage);
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async updateParticipantRestriction(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, userId } = req.params;
      const conversation = await chatsService.updateParticipantRestriction(req.user!.sub, id, userId, req.body.restrictFor);
      getIo().to(`conversation:${id}`).emit("conversation:updated", conversation);
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async updateParticipantCustomTitle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, userId } = req.params;
      const conversation = await chatsService.updateParticipantCustomTitle(req.user!.sub, id, userId, req.body.customTitle);
      getIo().to(`conversation:${id}`).emit("conversation:updated", conversation);
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async pat(req: Request, res: Response, next: NextFunction) {
    try {
      const systemMessage = await chatsService.pat(req.user!.sub, req.params.id, req.body.targetUserId);
      getIo().to(`conversation:${req.params.id}`).emit("message:new", systemMessage);
      res.status(201).json(systemMessage);
    } catch (err) {
      next(err);
    }
  },
};
