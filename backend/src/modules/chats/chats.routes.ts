import { Router } from "express";
import { chatsController } from "./chats.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, uuidParamHandler } from "../../utils/validate";
import {
  addParticipantSchema,
  banUserByIdSchema,
  clearHistorySchema,
  createConversationSchema,
  createInviteLinkSchema,
  joinByInviteSchema,
  markReadSchema,
  patSchema,
  pinMessageSchema,
  reorderPinnedSchema,
  setNoForwardsSchema,
  updateConversationSchema,
  updateDisappearingMessagesSchema,
  updateParticipantCustomTitleSchema,
  updateParticipantRestrictionSchema,
  updateParticipantRoleSchema,
  updatePreferencesSchema,
} from "./chats.schema";
import { messagesController } from "../messages/messages.controller";
import {
  editMessageSchema,
  rescheduleMessageSchema,
  sendMessageSchema,
  setReactionSchema,
  setReminderSchema,
  votePollSchema,
} from "../messages/messages.schema";

export const chatsRouter = Router();

chatsRouter.use(requireAuth);
chatsRouter.param("id", uuidParamHandler);
chatsRouter.param("messageId", uuidParamHandler);
chatsRouter.param("userId", uuidParamHandler);
chatsRouter.param("requestId", uuidParamHandler);

chatsRouter.get("/", chatsController.list);
chatsRouter.post("/", validateBody(createConversationSchema), chatsController.create);
chatsRouter.get("/:id", chatsController.get);
chatsRouter.patch("/:id", validateBody(updateConversationSchema), chatsController.update);
chatsRouter.patch("/:id/preferences", validateBody(updatePreferencesSchema), chatsController.updatePreferences);
chatsRouter.post("/:id/pinned-order", validateBody(reorderPinnedSchema), chatsController.reorderPinned);
chatsRouter.put("/:id/pinned-messages/:messageId", validateBody(pinMessageSchema), chatsController.pinMessage);
chatsRouter.delete("/:id/pinned-messages/:messageId", chatsController.unpinMessage);
chatsRouter.delete("/:id/pinned-messages", chatsController.unpinAllMessages);
chatsRouter.put(
  "/:id/disappearing-messages",
  validateBody(updateDisappearingMessagesSchema),
  chatsController.setDisappearingMessages
);
chatsRouter.put("/:id/no-forwards", validateBody(setNoForwardsSchema), chatsController.setNoForwards);
chatsRouter.post("/:id/pat", validateBody(patSchema), chatsController.pat);
chatsRouter.post("/:id/invite-link", validateBody(createInviteLinkSchema), chatsController.createInviteLink);
chatsRouter.delete("/:id/invite-link", chatsController.revokeInviteLink);
chatsRouter.get("/invite/:code", chatsController.getInvitePreview);
chatsRouter.post("/invite/:code/join", validateBody(joinByInviteSchema), chatsController.joinByInvite);
chatsRouter.post("/:id/clear", validateBody(clearHistorySchema), chatsController.clearHistory);
chatsRouter.delete("/:id", chatsController.deleteConversation);
chatsRouter.delete("/:id/for-everyone", chatsController.deleteConversationForEveryone);
chatsRouter.post("/:id/leave", chatsController.leave);
chatsRouter.post("/:id/participants", validateBody(addParticipantSchema), chatsController.addParticipant);
chatsRouter.delete("/:id/participants/:userId", chatsController.removeParticipant);
chatsRouter.post("/:id/participants/:userId/ban", chatsController.banParticipant);
chatsRouter.get("/:id/bans", chatsController.listBannedUsers);
chatsRouter.post("/:id/bans", validateBody(banUserByIdSchema), chatsController.banUserById);
chatsRouter.delete("/:id/bans/:userId", chatsController.unbanUser);
chatsRouter.patch(
  "/:id/participants/:userId/role",
  validateBody(updateParticipantRoleSchema),
  chatsController.updateParticipantRole
);
chatsRouter.patch(
  "/:id/participants/:userId/restrict",
  validateBody(updateParticipantRestrictionSchema),
  chatsController.updateParticipantRestriction
);
chatsRouter.patch(
  "/:id/participants/:userId/title",
  validateBody(updateParticipantCustomTitleSchema),
  chatsController.updateParticipantCustomTitle
);

chatsRouter.get("/:id/join-requests", chatsController.listJoinRequests);
chatsRouter.post("/:id/join-requests/:requestId/approve", chatsController.approveJoinRequest);
chatsRouter.post("/:id/join-requests/:requestId/decline", chatsController.declineJoinRequest);
chatsRouter.get("/join-requests/mine", chatsController.listMyJoinRequests);
chatsRouter.delete("/join-requests/mine/:requestId", chatsController.cancelMyJoinRequest);
chatsRouter.get("/:id/audit-log", chatsController.getAuditLog);

chatsRouter.get("/starred/messages", messagesController.listStarred);
chatsRouter.get("/mentions/messages", messagesController.listMentions);
chatsRouter.get("/reminders/messages", messagesController.listReminders);
chatsRouter.get("/common-groups/:userId", chatsController.listCommonGroups);
chatsRouter.get("/me/activity-stats", messagesController.getMyActivityStats);

chatsRouter.get("/:id/scheduled-messages", messagesController.listScheduled);
chatsRouter.delete("/:id/scheduled-messages/:messageId", messagesController.cancelScheduled);
chatsRouter.patch(
  "/:id/scheduled-messages/:messageId",
  validateBody(rescheduleMessageSchema),
  messagesController.rescheduleScheduled
);
chatsRouter.post("/:id/scheduled-messages/:messageId/send-now", messagesController.sendScheduledNow);

// Channel statistics
import { channelStatsService } from "./channelStats.service";
chatsRouter.get("/:id/stats/channel", async (req, res) => {
  const stats = await channelStatsService.getStats(req.user!.sub, req.params.id);
  res.json(stats);
});

chatsRouter.get("/:id/messages", messagesController.list);
chatsRouter.get("/:id/media", messagesController.listMedia);
chatsRouter.get("/:id/stats", messagesController.getStats);
chatsRouter.post("/:id/messages", validateBody(sendMessageSchema), messagesController.send);
chatsRouter.post("/:id/read", validateBody(markReadSchema), messagesController.markRead);
chatsRouter.delete("/:id/messages/:messageId", messagesController.remove);
chatsRouter.post("/:id/messages/:messageId/hide", messagesController.hideForMe);
chatsRouter.post("/:id/messages/:messageId/view", messagesController.view);
chatsRouter.patch("/:id/messages/:messageId", validateBody(editMessageSchema), messagesController.edit);
chatsRouter.get("/:id/messages/:messageId/history", messagesController.getEditHistory);
chatsRouter.put(
  "/:id/messages/:messageId/reactions",
  validateBody(setReactionSchema),
  messagesController.setReaction
);
chatsRouter.put("/:id/messages/:messageId/star", messagesController.toggleStar);
chatsRouter.put(
  "/:id/messages/:messageId/poll-vote",
  validateBody(votePollSchema),
  messagesController.votePoll
);
chatsRouter.put("/:id/messages/:messageId/poll-close", messagesController.closePoll);
chatsRouter.put(
  "/:id/messages/:messageId/reminder",
  validateBody(setReminderSchema),
  messagesController.setReminder
);
chatsRouter.delete("/:id/messages/:messageId/reminder", messagesController.cancelReminder);
