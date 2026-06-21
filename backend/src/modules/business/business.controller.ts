import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { createBusinessProfileSchema } from "./business.schema";
import { businessService } from "./business.service";

const router = Router();
router.use(requireAuth);

router.get("/me", async (req: Request, res: Response) => {
  const profile = await businessService.getProfile(req.user!.sub);
  res.json(profile);
});

router.put("/me", validateBody(createBusinessProfileSchema), async (req: Request, res: Response) => {
  const profile = await businessService.createOrUpdate(req.user!.sub, req.body);
  res.json(profile);
});

router.delete("/me", async (req: Request, res: Response) => {
  await businessService.deleteProfile(req.user!.sub);
  res.status(204).send();
});

router.get("/user/:userId", async (req: Request, res: Response) => {
  const profile = await businessService.getPublicProfile(req.params.userId);
  res.json(profile);
});

router.get("/search", async (req: Request, res: Response) => {
  const results = await businessService.search(req.query.q as string ?? "");
  res.json(results);
});

router.get("/category/:category", async (req: Request, res: Response) => {
  const results = await businessService.listByCategory(req.params.category);
  res.json(results);
});

export { router as businessRouter };
