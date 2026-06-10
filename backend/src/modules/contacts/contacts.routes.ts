import { Router } from "express";
import { contactsController } from "./contacts.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { addContactSchema } from "./contacts.schema";

export const contactsRouter = Router();

contactsRouter.use(requireAuth);

contactsRouter.get("/", contactsController.list);
contactsRouter.post("/", validateBody(addContactSchema), contactsController.sendRequest);
contactsRouter.get("/requests", contactsController.listIncoming);
contactsRouter.post("/requests/:requestId/accept", contactsController.accept);
contactsRouter.post("/requests/:requestId/decline", contactsController.decline);
contactsRouter.delete("/:contactId", contactsController.remove);
