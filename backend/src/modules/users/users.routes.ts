import { Router } from "express";
import { usersController } from "./users.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { updateProfileSchema } from "./users.schema";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get("/me", usersController.me);
usersRouter.patch("/me", validateBody(updateProfileSchema), usersController.updateMe);
usersRouter.get("/search", usersController.search);
usersRouter.get("/:id", usersController.getById);
