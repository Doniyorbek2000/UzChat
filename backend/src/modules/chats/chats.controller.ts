import { Request, Response, NextFunction } from "express";
import { chatsService } from "./chats.service";
import { getIo, isUserOnline } from "../../sockets";
import { filterViewersForLastSeen } from "../../utils/lastSeen";
import {
  createConversationSchema,
  addParticipantSchema,
  updateConversationSchema,
  updatePreferencesSchema,
  reorderPinnedSchema,
  clearHistorySchema,
  pinMessageSchema,
  banUserByIdSchema,
  joinByInviteSchema,
  createInviteLinkSchema,
  updateDisappearingMessagesSchema,
  setNoForwardsSchema,
  updateParticipantRoleSchema,
  updateParticipantRestrictionSchema,
  updateParticipantCustomTitleSchema,
  patSchema,
  markReadSchema,
  getAuditLogQuerySchema,
} from "./chats.schema";

// A participant's online-status cache may not include some other member yet
// if they had no shared conversation before now (presence:initial is only
// computed from conversations that existed at connect time). Tell each side
// about the other if they're currently online and allowed to see it per
// lastSeenPrivacy. Offline members need no announcement: their lastSeenAt is
// already included in `conversation`, and a false "online: false" here would
// overwrite it with "last seen just now".
async function syncNewParticipantsPresence(participants: { userId: string }[], newParticipantIds: string[]) {
  const isNew = new Set(newParticipantIds);
  for (const other of participants) {
    if (!isUserOnline(other.userId)) continue;
    const viewerIds = participants
      .filter((p) => p.userId !== other.userId && (isNew.has(p.userId) || isNew.has(other.userId)))
      .map((p) => p.userId);
    if (viewerIds.length === 0) continue;
    const allowedViewers = await filterViewersForLastSeen(other.userId, viewerIds);
    for (const viewerId of allowedViewers) {
      getIo().to(`user:${viewerId}`).emit("presence:update", { userId: other.userId, online: true });
    }
  }
}

export const chatsController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createConversationSchema.parse(req.body);
      const conversation = await chatsService.createConversation(req.user!.sub, input);
      for (const participant of conversation.participants) {
        getIo().to(`user:${participant.userId}`).socketsJoin(`conversation:${conversation.id}`);
      }
      getIo().to(`conversation:${conversation.id}`).emit("conversation:new", conversation);

      await syncNewParticipantsPresence(conversation.participants, conversation.participants.map((p) => p.userId));

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
      const input = addParticipantSchema.parse(req.body);
      const { conversation, systemMessages } = await chatsService.addParticipant(req.user!.sub, req.params.id, input);
      const newParticipantId: string = input.userId;

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

      await syncNewParticipantsPresence(conversation.participants, [newParticipantId]);

      res.status(201).json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateConversationSchema.parse(req.body);
      const { conversation, systemMessages } = await chatsService.updateConversation(req.user!.sub, req.params.id, input);
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
      const input = updatePreferencesSchema.parse(req.body);
      const conversation = await chatsService.updatePreferences(req.user!.sub, req.params.id, input);
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async reorderPinned(req: Request, res: Response, next: NextFunction) {
    try {
      const { direction } = reorderPinnedSchema.parse(req.body);
      const conversations = await chatsService.reorderPinned(req.user!.sub, req.params.id, direction);
      res.json(conversations);
    } catch (err) {
      next(err);
    }
  },

  async clearHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { olderThanDays } = clearHistorySchema.parse(req.body);
      await chatsService.clearHistory(req.user!.sub, req.params.id, olderThanDays);
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
      const input = pinMessageSchema.parse(req.body);
      const { conversation, systemMessage } = await chatsService.pinMessage(
        req.user!.sub,
        req.params.id,
        req.params.messageId,
        input
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
      const { disappearingSeconds } = updateDisappearingMessagesSchema.parse(req.body);
      const { conversation, systemMessage } = await chatsService.setDisappearingMessages(
        req.user!.sub,
        req.params.id,
        disappearingSeconds
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
      const { noForwards } = setNoForwardsSchema.parse(req.body);
      const { conversation, systemMessage } = await chatsService.setNoForwards(
        req.user!.sub,
        req.params.id,
        noForwards
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
      const input = createInviteLinkSchema.parse(req.body);
      const result = await chatsService.createInviteLink(req.user!.sub, req.params.id, input);
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
      const input = joinByInviteSchema.parse(req.body);
      const result = await chatsService.joinByInvite(userId, req.params.code, input);

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

        await syncNewParticipantsPresence(conversation.participants, [userId]);
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
      const { before } = getAuditLogQuerySchema.parse(req.query);
      const entries = await chatsService.getAuditLog(req.user!.sub, req.params.id, before);
      res.json(entries);
    } catch (err) {
      next(err);
    }
  },

  async approveJoinRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, requestId } = req.params;
      const { conversation, systemMessages, newParticipantId, otherManagerIds } = await chatsService.approveJoinRequest(
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
      if (otherManagerIds.length > 0) {
        getIo()
          .to(otherManagerIds.map((managerId) => `user:${managerId}`))
          .emit("conversation:joinRequest", { conversationId: conversation.id });
      }

      await syncNewParticipantsPresence(conversation.participants, [newParticipantId]);

      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async declineJoinRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, requestId } = req.params;
      const { otherManagerIds } = await chatsService.declineJoinRequest(req.user!.sub, id, requestId);
      if (otherManagerIds.length > 0) {
        getIo()
          .to(otherManagerIds.map((managerId) => `user:${managerId}`))
          .emit("conversation:joinRequest", { conversationId: id });
      }
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
      const input = banUserByIdSchema.parse(req.body);
      const ban = await chatsService.banUserById(req.user!.sub, req.params.id, input);
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
      const { role } = updateParticipantRoleSchema.parse(req.body);
      const { conversation, systemMessage } = await chatsService.updateParticipantRole(req.user!.sub, id, userId, role);
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
      const { restrictFor } = updateParticipantRestrictionSchema.parse(req.body);
      const conversation = await chatsService.updateParticipantRestriction(req.user!.sub, id, userId, restrictFor);
      getIo().to(`conversation:${id}`).emit("conversation:updated", conversation);
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async updateParticipantCustomTitle(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, userId } = req.params;
      const { customTitle } = updateParticipantCustomTitleSchema.parse(req.body);
      const conversation = await chatsService.updateParticipantCustomTitle(req.user!.sub, id, userId, customTitle);
      getIo().to(`conversation:${id}`).emit("conversation:updated", conversation);
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  },

  async pat(req: Request, res: Response, next: NextFunction) {
    try {
      const { targetUserId } = patSchema.parse(req.body);
      const systemMessage = await chatsService.pat(req.user!.sub, req.params.id, targetUserId);
      getIo().to(`conversation:${req.params.id}`).emit("message:new", systemMessage);
      res.status(201).json(systemMessage);
    } catch (err) {
      next(err);
    }
  },
};
