import { Router } from "express";
import { foldersController } from "./folders.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { createFolderSchema, updateFolderSchema } from "./folders.schema";

export const foldersRouter = Router();

foldersRouter.use(requireAuth);

foldersRouter.get("/", foldersController.list);
foldersRouter.post("/", validateBody(createFolderSchema), foldersController.create);
foldersRouter.patch("/:id", validateBody(updateFolderSchema), foldersController.update);
foldersRouter.delete("/:id", foldersController.remove);
