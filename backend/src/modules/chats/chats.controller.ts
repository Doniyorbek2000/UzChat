import { Request, Response } from "express";
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
  async create(req: Request, res: Response) {
    const input = createConversationSchema.parse(req.body);
    const conversation = await chatsService.createConversation(req.user!.sub, input);
    for (const participant of conversation.participants) {
      getIo().to(`user:${participant.userId}`).socketsJoin(`conversation:${conversation.id}`);
    }
    getIo().to(`conversation:${conversation.id}`).emit("conversation:new", conversation);
    await syncNewParticipantsPresence(conversation.participants, conversation.participants.map((p) => p.userId));
    res.status(201).json(conversation);
  },

  async list(req: Request, res: Response) {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
    const cursor = req.query.cursor as string | undefined;
    const conversations = await chatsService.listConversations(req.user!.sub, { limit, cursor });
    res.json(conversations);
  },

  async get(req: Request, res: Response) {
    const conversation = await chatsService.getConversation(req.user!.sub, req.params.id);
    res.json(conversation);
  },

  async addParticipant(req: Request, res: Response) {
    const input = addParticipantSchema.parse(req.body);
    const { conversation, systemMessages } = await chatsService.addParticipant(req.user!.sub, req.params.id, input);
    const newParticipantId: string = input.userId;

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
    await syncNewParticipantsPresence(conversation.participants, [newParticipantId]);
    res.status(201).json(conversation);
  },

  async update(req: Request, res: Response) {
    const input = updateConversationSchema.parse(req.body);
    const { conversation, systemMessages } = await chatsService.updateConversation(req.user!.sub, req.params.id, input);
    getIo().to(`conversation:${conversation.id}`).emit("conversation:updated", conversation);
    for (const systemMessage of systemMessages) {
      getIo().to(`conversation:${conversation.id}`).emit("message:new", systemMessage);
    }
    res.json(conversation);
  },

  async updatePreferences(req: Request, res: Response) {
    const input = updatePreferencesSchema.parse(req.body);
    const conversation = await chatsService.updatePreferences(req.user!.sub, req.params.id, input);
    res.json(conversation);
  },

  async reorderPinned(req: Request, res: Response) {
    const { direction } = reorderPinnedSchema.parse(req.body);
    const conversations = await chatsService.reorderPinned(req.user!.sub, req.params.id, direction);
    res.json(conversations);
  },

  async clearHistory(req: Request, res: Response) {
    const { olderThanDays } = clearHistorySchema.parse(req.body);
    await chatsService.clearHistory(req.user!.sub, req.params.id, olderThanDays);
    res.status(204).send();
  },

  async deleteConversation(req: Request, res: Response) {
    await chatsService.deleteConversation(req.user!.sub, req.params.id);
    res.status(204).send();
  },

  async deleteConversationForEveryone(req: Request, res: Response) {
    const conversationId = req.params.id;
    await chatsService.deleteConversationForEveryone(req.user!.sub, conversationId);
    getIo().to(`conversation:${conversationId}`).emit("conversation:deleted", { conversationId });
    res.status(204).send();
  },

  async listCommonGroups(req: Request, res: Response) {
    const groups = await chatsService.listCommonGroups(req.user!.sub, req.params.userId);
    res.json(groups);
  },

  async pinMessage(req: Request, res: Response) {
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
  },

  async unpinMessage(req: Request, res: Response) {
    const conversation = await chatsService.unpinMessage(req.user!.sub, req.params.id, req.params.messageId);
    getIo().to(`conversation:${conversation.id}`).emit("conversation:updated", conversation);
    res.json(conversation);
  },

  async unpinAllMessages(req: Request, res: Response) {
    const conversation = await chatsService.unpinAllMessages(req.user!.sub, req.params.id);
    getIo().to(`conversation:${conversation.id}`).emit("conversation:updated", conversation);
    res.json(conversation);
  },

  async setDisappearingMessages(req: Request, res: Response) {
    const { disappearingSeconds } = updateDisappearingMessagesSchema.parse(req.body);
    const { conversation, systemMessage } = await chatsService.setDisappearingMessages(
      req.user!.sub,
      req.params.id,
      disappearingSeconds
    );
    getIo().to(`conversation:${conversation.id}`).emit("conversation:updated", conversation);
    if (systemMessage) getIo().to(`conversation:${conversation.id}`).emit("message:new", systemMessage);
    res.json(conversation);
  },

  async setNoForwards(req: Request, res: Response) {
    const { noForwards } = setNoForwardsSchema.parse(req.body);
    const { conversation, systemMessage } = await chatsService.setNoForwards(
      req.user!.sub,
      req.params.id,
      noForwards
    );
    getIo().to(`conversation:${conversation.id}`).emit("conversation:updated", conversation);
    if (systemMessage) getIo().to(`conversation:${conversation.id}`).emit("message:new", systemMessage);
    res.json(conversation);
  },

  async createInviteLink(req: Request, res: Response) {
    const input = createInviteLinkSchema.parse(req.body);
    const result = await chatsService.createInviteLink(req.user!.sub, req.params.id, input);
    res.json(result);
  },

  async revokeInviteLink(req: Request, res: Response) {
    await chatsService.revokeInviteLink(req.user!.sub, req.params.id);
    res.status(204).send();
  },

  async getInvitePreview(req: Request, res: Response) {
    const preview = await chatsService.getInvitePreview(req.params.code);
    res.json(preview);
  },

  async joinByInvite(req: Request, res: Response) {
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
  },

  async listJoinRequests(req: Request, res: Response) {
    const requests = await chatsService.listJoinRequests(req.user!.sub, req.params.id);
    res.json(requests);
  },

  async getAuditLog(req: Request, res: Response) {
    const { before } = getAuditLogQuerySchema.parse(req.query);
    const entries = await chatsService.getAuditLog(req.user!.sub, req.params.id, before);
    res.json(entries);
  },

  async approveJoinRequest(req: Request, res: Response) {
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
  },

  async declineJoinRequest(req: Request, res: Response) {
    const { id, requestId } = req.params;
    const { otherManagerIds } = await chatsService.declineJoinRequest(req.user!.sub, id, requestId);
    if (otherManagerIds.length > 0) {
      getIo()
        .to(otherManagerIds.map((managerId) => `user:${managerId}`))
        .emit("conversation:joinRequest", { conversationId: id });
    }
    res.status(204).send();
  },

  async listMyJoinRequests(req: Request, res: Response) {
    const requests = await chatsService.listMyJoinRequests(req.user!.sub);
    res.json(requests);
  },

  async cancelMyJoinRequest(req: Request, res: Response) {
    await chatsService.cancelMyJoinRequest(req.user!.sub, req.params.requestId);
    res.status(204).send();
  },

  async removeParticipant(req: Request, res: Response) {
    const { id, userId } = req.params;
    const { conversation, systemMessage } = await chatsService.removeParticipant(req.user!.sub, id, userId);

    getIo().to(`conversation:${id}`).emit("conversation:participantRemoved", { conversationId: id, userId });
    getIo().to(`conversation:${id}`).except(`user:${userId}`).emit("conversation:updated", conversation);
    getIo().to(`conversation:${id}`).except(`user:${userId}`).emit("message:new", systemMessage);
    getIo().in(`user:${userId}`).socketsLeave(`conversation:${id}`);
    res.json(conversation);
  },

  async banParticipant(req: Request, res: Response) {
    const { id, userId } = req.params;
    const { conversation, systemMessage } = await chatsService.removeParticipant(req.user!.sub, id, userId, true);

    getIo().to(`conversation:${id}`).emit("conversation:participantRemoved", { conversationId: id, userId });
    getIo().to(`conversation:${id}`).except(`user:${userId}`).emit("conversation:updated", conversation);
    getIo().to(`conversation:${id}`).except(`user:${userId}`).emit("message:new", systemMessage);
    getIo().in(`user:${userId}`).socketsLeave(`conversation:${id}`);
    res.json(conversation);
  },

  async listBannedUsers(req: Request, res: Response) {
    const bans = await chatsService.listBannedUsers(req.user!.sub, req.params.id);
    res.json(bans);
  },

  async banUserById(req: Request, res: Response) {
    const input = banUserByIdSchema.parse(req.body);
    const ban = await chatsService.banUserById(req.user!.sub, req.params.id, input);
    res.status(201).json(ban);
  },

  async unbanUser(req: Request, res: Response) {
    const { id, userId } = req.params;
    await chatsService.unbanUser(req.user!.sub, id, userId);
    res.status(204).send();
  },

  async leave(req: Request, res: Response) {
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
  },

  async updateParticipantRole(req: Request, res: Response) {
    const { id, userId } = req.params;
    const { role } = updateParticipantRoleSchema.parse(req.body);
    const { conversation, systemMessage } = await chatsService.updateParticipantRole(req.user!.sub, id, userId, role);
    getIo().to(`conversation:${id}`).emit("conversation:updated", conversation);
    getIo().to(`conversation:${id}`).emit("message:new", systemMessage);
    res.json(conversation);
  },

  async updateParticipantRestriction(req: Request, res: Response) {
    const { id, userId } = req.params;
    const { restrictFor } = updateParticipantRestrictionSchema.parse(req.body);
    const conversation = await chatsService.updateParticipantRestriction(req.user!.sub, id, userId, restrictFor);
    getIo().to(`conversation:${id}`).emit("conversation:updated", conversation);
    res.json(conversation);
  },

  async updateParticipantCustomTitle(req: Request, res: Response) {
    const { id, userId } = req.params;
    const { customTitle } = updateParticipantCustomTitleSchema.parse(req.body);
    const conversation = await chatsService.updateParticipantCustomTitle(req.user!.sub, id, userId, customTitle);
    getIo().to(`conversation:${id}`).emit("conversation:updated", conversation);
    res.json(conversation);
  },

  async pat(req: Request, res: Response) {
    const { targetUserId } = patSchema.parse(req.body);
    const systemMessage = await chatsService.pat(req.user!.sub, req.params.id, targetUserId);
    getIo().to(`conversation:${req.params.id}`).emit("message:new", systemMessage);
    res.status(201).json(systemMessage);
  },

  async listMembers(req: Request, res: Response) {
    const { id } = req.params;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string) || 50));
    const search = (req.query.search as string) || undefined;
    const result = await chatsService.listMembersPaginated(req.user!.sub, id, page, limit, search);
    res.json(result);
  },

  async getGroupStats(req: Request, res: Response) {
    const stats = await chatsService.getGroupStats(req.user!.sub, req.params.id);
    res.json(stats);
  },

  async upgradeToSupergroup(req: Request, res: Response) {
    const conversation = await chatsService.upgradeToSupergroup(req.user!.sub, req.params.id);
    getIo().to(`conversation:${req.params.id}`).emit("conversation:updated", conversation);
    res.json(conversation);
  },
};
