import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, validateUuidParam } from "../../utils/validate";
import { createExportSchema } from "./export.schema";
import { exportService } from "./export.service";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
  const exports = await exportService.listExports(req.user!.sub);
  res.json(exports);
});

router.post("/", validateBody(createExportSchema), async (req: Request, res: Response) => {
  const chatExport = await exportService.createExport(req.user!.sub, req.body);
  res.status(201).json(chatExport);
});

router.get("/:exportId", validateUuidParam("exportId"), async (req: Request, res: Response) => {
  const chatExport = await exportService.getExport(req.user!.sub, req.params.exportId);
  res.json(chatExport);
});

router.delete("/:exportId", validateUuidParam("exportId"), async (req: Request, res: Response) => {
  await exportService.deleteExport(req.user!.sub, req.params.exportId);
  res.status(204).send();
});

export { router as exportRouter };
