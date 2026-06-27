import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, validateUuidParam } from "../../utils/validate";
import { shareLocationSchema, updateLocationSchema } from "./location.schema";
import { locationService } from "./location.service";

const router = Router();
router.use(requireAuth);

router.post("/share", validateBody(shareLocationSchema), async (req: Request, res: Response) => {
  const share = await locationService.shareLocation(req.user!.sub, req.body);
  res.status(201).json(share);
});

router.patch("/:shareId", validateUuidParam("shareId"), validateBody(updateLocationSchema), async (req: Request, res: Response) => {
  const share = await locationService.updateLiveLocation(req.user!.sub, req.params.shareId, req.body);
  res.json(share);
});

router.post("/:shareId/stop", validateUuidParam("shareId"), async (req: Request, res: Response) => {
  const share = await locationService.stopLiveLocation(req.user!.sub, req.params.shareId);
  res.json(share);
});

router.get("/conversations/:conversationId", validateUuidParam("conversationId"), async (req: Request, res: Response) => {
  const locations = await locationService.getConversationLocations(req.params.conversationId);
  res.json(locations);
});

router.get("/live", async (req: Request, res: Response) => {
  const locations = await locationService.getMyLiveLocations(req.user!.sub);
  res.json(locations);
});

export { router as locationRouter };
