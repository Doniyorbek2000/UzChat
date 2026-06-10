import { Router } from "express";
import { chatsController } from "./chats.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import {
  addParticipantSchema,
  createConversationSchema,
  updateConversationSchema,
  updateParticipantRoleSchema,
} from "./chats.schema";
import { messagesController } from "../messages/messages.controller";
import { sendMessageSchema } from "../messages/messages.schema";

export const chatsRouter = Router();

chatsRouter.use(requireAuth);

chatsRouter.get("/", chatsController.list);
chatsRouter.post("/", validateBody(createConversationSchema), chatsController.create);
chatsRouter.get("/:id", chatsController.get);
chatsRouter.patch("/:id", validateBody(updateConversationSchema), chatsController.update);
chatsRouter.post("/:id/leave", chatsController.leave);
chatsRouter.post("/:id/participants", validateBody(addParticipantSchema), chatsController.addParticipant);
chatsRouter.delete("/:id/participants/:userId", chatsController.removeParticipant);
chatsRouter.patch(
  "/:id/participants/:userId/role",
  validateBody(updateParticipantRoleSchema),
  chatsController.updateParticipantRole
);

chatsRouter.get("/:id/messages", messagesController.list);
chatsRouter.post("/:id/messages", validateBody(sendMessageSchema), messagesController.send);
chatsRouter.post("/:id/read", messagesController.markRead);
chatsRouter.delete("/:id/messages/:messageId", messagesController.remove);
