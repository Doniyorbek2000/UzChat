import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { mediaController } from "./media.controller";
import { upload } from "./upload";

export const mediaRouter = Router();

mediaRouter.use(requireAuth);

mediaRouter.post("/upload", upload.single("file"), mediaController.upload);
mediaRouter.get("/:filename", mediaController.get);
