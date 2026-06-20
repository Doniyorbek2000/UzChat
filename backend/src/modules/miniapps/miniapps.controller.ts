import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { createMiniAppSchema, updateMiniAppSchema } from "./miniapps.schema";
import { miniAppsService } from "./miniapps.service";

const router = Router();

router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
  const category = req.query.category as string | undefined;
  const apps = await miniAppsService.list(category);
  res.json(apps);
});

router.get("/mine", async (req: Request, res: Response) => {
  const apps = await miniAppsService.listMine(req.user!.sub);
  res.json(apps);
});

router.get("/:id", async (req: Request, res: Response) => {
  const app = await miniAppsService.getById(req.params.id);
  res.json(app);
});

router.post("/", validateBody(createMiniAppSchema), async (req: Request, res: Response) => {
  const app = await miniAppsService.create(req.user!.sub, req.body);
  res.status(201).json(app);
});

router.patch("/:id", validateBody(updateMiniAppSchema), async (req: Request, res: Response) => {
  const app = await miniAppsService.update(req.user!.sub, req.params.id, req.body);
  res.json(app);
});

router.delete("/:id", async (req: Request, res: Response) => {
  await miniAppsService.remove(req.user!.sub, req.params.id);
  res.status(204).send();
});

export { router as miniAppsRouter };
