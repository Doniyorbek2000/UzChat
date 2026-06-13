import { Router } from "express";
import { contactsController } from "./contacts.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { addContactSchema, updateContactSchema } from "./contacts.schema";

export const contactsRouter = Router();

contactsRouter.use(requireAuth);

contactsRouter.get("/", contactsController.list);
contactsRouter.post("/", validateBody(addContactSchema), contactsController.sendRequest);
contactsRouter.get("/requests", contactsController.listIncoming);
contactsRouter.post("/requests/:requestId/accept", contactsController.accept);
contactsRouter.post("/requests/:requestId/decline", contactsController.decline);
contactsRouter.get("/suggestions", contactsController.listSuggestions);
contactsRouter.post("/suggestions/:userId/dismiss", contactsController.dismissSuggestion);
contactsRouter.get("/birthdays", contactsController.listUpcomingBirthdays);
contactsRouter.get("/blocked", contactsController.listBlocked);
contactsRouter.post("/blocked/:userId", contactsController.block);
contactsRouter.delete("/blocked/:userId", contactsController.unblock);
contactsRouter.patch("/:contactId", validateBody(updateContactSchema), contactsController.update);
contactsRouter.delete("/:contactId", contactsController.remove);
