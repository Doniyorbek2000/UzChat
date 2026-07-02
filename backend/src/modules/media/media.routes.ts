import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { mediaUploadRateLimiter } from "../../middleware/rateLimit.middleware";
import { validateBody } from "../../utils/validate";
import { mediaController } from "./media.controller";
import { upload, finalizeUpload } from "./upload";
import { fileSecurityService } from "./fileSecurity.service";
import { updateFileSecuritySchema, checkFileSchema } from "./fileSecurity.schema";

export const mediaRouter = Router();

mediaRouter.use(requireAuth);

mediaRouter.post("/upload", mediaUploadRateLimiter, upload.single("file"), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: { code: "BAD_REQUEST", message: "Fayl yuborilmadi" } });
    return;
  }

  const check = await fileSecurityService.checkUploadSafety(
    req.file.originalname,
    req.file.size,
    req.file.mimetype
  );

  const stored = await finalizeUpload(req.file);
  const response: Record<string, unknown> = { url: stored.url, size: stored.size };

  if (check.warning) {
    response.warning = check.warning;
  }

  res.status(201).json(response);
});

mediaRouter.get("/security/settings", async (req: Request, res: Response) => {
  const settings = await fileSecurityService.getSecuritySettings(req.user!.sub);
  res.json(settings);
});

mediaRouter.patch("/security/settings", validateBody(updateFileSecuritySchema), async (req: Request, res: Response) => {
  const settings = await fileSecurityService.updateSecuritySettings(req.user!.sub, req.body);
  res.json(settings);
});

mediaRouter.post("/security/check", validateBody(checkFileSchema), async (req: Request, res: Response) => {
  const result = await fileSecurityService.checkFileForRecipient(
    req.body.recipientId,
    req.user!.sub,
    req.body.filename,
    req.body.fileSize,
    req.body.mimeType
  );
  res.json(result);
});

mediaRouter.get("/security/dangerous-types", async (_req: Request, res: Response) => {
  res.json({ extensions: fileSecurityService.getDangerousExtensions() });
});

mediaRouter.get("/:filename", mediaController.get);
