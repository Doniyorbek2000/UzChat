import { Router } from "express";
import { usersController } from "./users.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import {
  changePasswordSchema,
  deleteAccountSchema,
  disableTwoFactorSchema,
  setLastSeenExceptionSchema,
  setTwoFactorSchema,
  updateProfileSchema,
} from "./users.schema";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get("/me", usersController.me);
usersRouter.patch("/me", validateBody(updateProfileSchema), usersController.updateMe);
usersRouter.get("/me/username-history", usersController.getUsernameHistory);
usersRouter.patch("/me/password", validateBody(changePasswordSchema), usersController.changePassword);
usersRouter.put("/me/two-factor", validateBody(setTwoFactorSchema), usersController.setTwoFactor);
usersRouter.delete("/me/two-factor", validateBody(disableTwoFactorSchema), usersController.disableTwoFactor);
usersRouter.delete("/me", validateBody(deleteAccountSchema), usersController.deleteAccount);
usersRouter.get("/me/last-seen-exceptions", usersController.listLastSeenExceptions);
usersRouter.put("/me/last-seen-exceptions/:id", validateBody(setLastSeenExceptionSchema), usersController.setLastSeenException);
usersRouter.delete("/me/last-seen-exceptions/:id", usersController.removeLastSeenException);
usersRouter.get("/search", usersController.search);
usersRouter.post("/:id/notify-online", usersController.notifyOnline);
usersRouter.delete("/:id/notify-online", usersController.cancelNotifyOnline);
usersRouter.get("/:id", usersController.getById);
