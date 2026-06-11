import { Router } from "express";
import { chatsController } from "./chats.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import {
  addParticipantSchema,
  createConversationSchema,
  joinByInviteSchema,
  setPinnedMessageSchema,
  updateConversationSchema,
  updateDisappearingMessagesSchema,
  updateParticipantRestrictionSchema,
  updateParticipantRoleSchema,
  updatePreferencesSchema,
} from "./chats.schema";
import { messagesController } from "../messages/messages.controller";
import { editMessageSchema, sendMessageSchema, setReactionSchema } from "../messages/messages.schema";

export const chatsRouter = Router();

chatsRouter.use(requireAuth);

chatsRouter.get("/", chatsController.list);
chatsRouter.post("/", validateBody(createConversationSchema), chatsController.create);
chatsRouter.get("/:id", chatsController.get);
chatsRouter.patch("/:id", validateBody(updateConversationSchema), chatsController.update);
chatsRouter.patch("/:id/preferences", validateBody(updatePreferencesSchema), chatsController.updatePreferences);
chatsRouter.put("/:id/pinned-message", validateBody(setPinnedMessageSchema), chatsController.setPinnedMessage);
chatsRouter.put(
  "/:id/disappearing-messages",
  validateBody(updateDisappearingMessagesSchema),
  chatsController.setDisappearingMessages
);
chatsRouter.post("/:id/invite-link", chatsController.createInviteLink);
chatsRouter.delete("/:id/invite-link", chatsController.revokeInviteLink);
chatsRouter.get("/invite/:code", chatsController.getInvitePreview);
chatsRouter.post("/invite/:code/join", validateBody(joinByInviteSchema), chatsController.joinByInvite);
chatsRouter.post("/:id/clear", chatsController.clearHistory);
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

chatsRouter.get("/starred/messages", messagesController.listStarred);

chatsRouter.get("/:id/messages", messagesController.list);
chatsRouter.get("/:id/media", messagesController.listMedia);
chatsRouter.post("/:id/messages", validateBody(sendMessageSchema), messagesController.send);
chatsRouter.post("/:id/read", messagesController.markRead);
chatsRouter.delete("/:id/messages/:messageId", messagesController.remove);
chatsRouter.post("/:id/messages/:messageId/hide", messagesController.hideForMe);
chatsRouter.patch("/:id/messages/:messageId", validateBody(editMessageSchema), messagesController.edit);
chatsRouter.put(
  "/:id/messages/:messageId/reactions",
  validateBody(setReactionSchema),
  messagesController.setReaction
);
chatsRouter.put("/:id/messages/:messageId/star", messagesController.toggleStar);
