import { Router } from "express";
import { chatsController } from "./chats.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import {
  addParticipantSchema,
  createConversationSchema,
  createInviteLinkSchema,
  joinByInviteSchema,
  setNoForwardsSchema,
  updateConversationSchema,
  updateDisappearingMessagesSchema,
  updateParticipantRestrictionSchema,
  updateParticipantRoleSchema,
  updatePreferencesSchema,
} from "./chats.schema";
import { messagesController } from "../messages/messages.controller";
import { editMessageSchema, sendMessageSchema, setReactionSchema, votePollSchema } from "../messages/messages.schema";

export const chatsRouter = Router();

chatsRouter.use(requireAuth);

chatsRouter.get("/", chatsController.list);
chatsRouter.post("/", validateBody(createConversationSchema), chatsController.create);
chatsRouter.get("/:id", chatsController.get);
chatsRouter.patch("/:id", validateBody(updateConversationSchema), chatsController.update);
chatsRouter.patch("/:id/preferences", validateBody(updatePreferencesSchema), chatsController.updatePreferences);
chatsRouter.put("/:id/pinned-messages/:messageId", chatsController.pinMessage);
chatsRouter.delete("/:id/pinned-messages/:messageId", chatsController.unpinMessage);
chatsRouter.delete("/:id/pinned-messages", chatsController.unpinAllMessages);
chatsRouter.put(
  "/:id/disappearing-messages",
  validateBody(updateDisappearingMessagesSchema),
  chatsController.setDisappearingMessages
);
chatsRouter.put("/:id/no-forwards", validateBody(setNoForwardsSchema), chatsController.setNoForwards);
chatsRouter.post("/:id/invite-link", validateBody(createInviteLinkSchema), chatsController.createInviteLink);
chatsRouter.delete("/:id/invite-link", chatsController.revokeInviteLink);
chatsRouter.get("/invite/:code", chatsController.getInvitePreview);
chatsRouter.post("/invite/:code/join", validateBody(joinByInviteSchema), chatsController.joinByInvite);
chatsRouter.post("/:id/clear", chatsController.clearHistory);
chatsRouter.delete("/:id", chatsController.deleteConversation);
chatsRouter.post("/:id/leave", chatsController.leave);
chatsRouter.post("/:id/participants", validateBody(addParticipantSchema), chatsController.addParticipant);
chatsRouter.delete("/:id/participants/:userId", chatsController.removeParticipant);
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

chatsRouter.get("/:id/join-requests", chatsController.listJoinRequests);
chatsRouter.post("/:id/join-requests/:requestId/approve", chatsController.approveJoinRequest);
chatsRouter.post("/:id/join-requests/:requestId/decline", chatsController.declineJoinRequest);
chatsRouter.get("/:id/audit-log", chatsController.getAuditLog);

chatsRouter.get("/starred/messages", messagesController.listStarred);
chatsRouter.get("/common-groups/:userId", chatsController.listCommonGroups);

chatsRouter.get("/:id/scheduled-messages", messagesController.listScheduled);
chatsRouter.delete("/:id/scheduled-messages/:messageId", messagesController.cancelScheduled);

chatsRouter.get("/:id/messages", messagesController.list);
chatsRouter.get("/:id/media", messagesController.listMedia);
chatsRouter.get("/:id/stats", messagesController.getStats);
chatsRouter.post("/:id/messages", validateBody(sendMessageSchema), messagesController.send);
chatsRouter.post("/:id/read", messagesController.markRead);
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
