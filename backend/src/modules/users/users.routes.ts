import { Router } from "express";
import { usersController } from "./users.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { changePasswordSchema, disableTwoFactorSchema, setTwoFactorSchema, updateProfileSchema } from "./users.schema";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get("/me", usersController.me);
usersRouter.patch("/me", validateBody(updateProfileSchema), usersController.updateMe);
usersRouter.patch("/me/password", validateBody(changePasswordSchema), usersController.changePassword);
usersRouter.put("/me/two-factor", validateBody(setTwoFactorSchema), usersController.setTwoFactor);
usersRouter.delete("/me/two-factor", validateBody(disableTwoFactorSchema), usersController.disableTwoFactor);
usersRouter.get("/search", usersController.search);
usersRouter.get("/:id", usersController.getById);
