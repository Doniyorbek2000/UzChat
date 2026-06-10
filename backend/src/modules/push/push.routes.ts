import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { registerPushTokenSchema } from "./push.schema";
import { pushController } from "./push.controller";

export const pushRouter = Router();

pushRouter.use(requireAuth);
pushRouter.post("/token", validateBody(registerPushTokenSchema), pushController.register);
pushRouter.delete("/token", validateBody(registerPushTokenSchema), pushController.unregister);
