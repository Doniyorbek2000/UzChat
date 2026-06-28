import { Router } from "express";
import { broadcastsController } from "./broadcasts.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, uuidParamHandler } from "../../utils/validate";
import { createBroadcastListSchema, updateBroadcastListSchema } from "./broadcasts.schema";

export const broadcastsRouter = Router();

broadcastsRouter.use(requireAuth);
broadcastsRouter.param("id", uuidParamHandler);

broadcastsRouter.get("/", broadcastsController.list);
broadcastsRouter.post("/", validateBody(createBroadcastListSchema), broadcastsController.create);
broadcastsRouter.patch("/:id", validateBody(updateBroadcastListSchema), broadcastsController.update);
broadcastsRouter.delete("/:id", broadcastsController.remove);
