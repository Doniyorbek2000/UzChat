import { Router } from "express";
import { contactsController } from "./contacts.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, uuidParamHandler } from "../../utils/validate";
import { addContactSchema, updateContactSchema } from "./contacts.schema";

export const contactsRouter = Router();

contactsRouter.use(requireAuth);
contactsRouter.param("requestId", uuidParamHandler);
contactsRouter.param("userId", uuidParamHandler);
contactsRouter.param("contactId", uuidParamHandler);

contactsRouter.get("/", contactsController.list);
contactsRouter.post("/", validateBody(addContactSchema), contactsController.sendRequest);
contactsRouter.get("/requests", contactsController.listIncoming);
contactsRouter.get("/requests/outgoing", contactsController.listOutgoing);
contactsRouter.post("/requests/:requestId/accept", contactsController.accept);
contactsRouter.post("/requests/:requestId/decline", contactsController.decline);
contactsRouter.get("/suggestions", contactsController.listSuggestions);
contactsRouter.post("/suggestions/:userId/dismiss", contactsController.dismissSuggestion);
contactsRouter.get("/birthdays", contactsController.listUpcomingBirthdays);
contactsRouter.get("/mutual/:userId", contactsController.listMutual);
contactsRouter.get("/blocked", contactsController.listBlocked);
contactsRouter.post("/blocked/:userId", contactsController.block);
contactsRouter.delete("/blocked/:userId", contactsController.unblock);
contactsRouter.patch("/:contactId", validateBody(updateContactSchema), contactsController.update);
contactsRouter.delete("/:contactId", contactsController.remove);
