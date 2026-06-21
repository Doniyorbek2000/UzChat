import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, validateQuery } from "../../utils/validate";
import { updateLocationSchema, nearbyQuerySchema } from "./nearby.schema";
import { nearbyService } from "./nearby.service";

const router = Router();
router.use(requireAuth);

router.put("/location", validateBody(updateLocationSchema), async (req: Request, res: Response) => {
  const location = await nearbyService.updateLocation(req.user!.sub, req.body);
  res.json(location);
});

router.put("/visibility", async (req: Request, res: Response) => {
  const { isVisible } = req.body;
  const location = await nearbyService.setVisibility(req.user!.sub, isVisible === true);
  res.json(location);
});

router.get("/", validateQuery(nearbyQuerySchema), async (req: Request, res: Response) => {
  const people = await nearbyService.findNearby(req.user!.sub, req.query as any);
  res.json(people);
});

router.delete("/location", async (req: Request, res: Response) => {
  await nearbyService.hideLocation(req.user!.sub);
  res.status(204).send();
});

export { router as nearbyRouter };
