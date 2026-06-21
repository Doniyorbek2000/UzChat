import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { cloudService } from "./cloud.service";

const router = Router();
router.use(requireAuth);

router.get("/files", async (req: Request, res: Response) => {
  const files = await cloudService.listFiles(req.user!.sub, req.query.folderId as string | undefined);
  res.json(files);
});

router.get("/folders", async (req: Request, res: Response) => {
  const folders = await cloudService.listFolders(req.user!.sub, req.query.parentId as string | undefined);
  res.json(folders);
});

router.post("/folders", async (req: Request, res: Response) => {
  const folder = await cloudService.createFolder(req.user!.sub, req.body.name, req.body.parentId);
  res.status(201).json(folder);
});

router.post("/files", async (req: Request, res: Response) => {
  const file = await cloudService.uploadFile(req.user!.sub, req.body);
  res.status(201).json(file);
});

router.delete("/files/:fileId", async (req: Request, res: Response) => {
  await cloudService.deleteFile(req.user!.sub, req.params.fileId);
  res.status(204).send();
});

router.delete("/folders/:folderId", async (req: Request, res: Response) => {
  await cloudService.deleteFolder(req.user!.sub, req.params.folderId);
  res.status(204).send();
});

router.get("/usage", async (req: Request, res: Response) => {
  const usage = await cloudService.getUsage(req.user!.sub);
  res.json(usage);
});

export { router as cloudRouter };
