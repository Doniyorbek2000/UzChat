import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, validateUuidParam } from "../../utils/validate";
import { createSubscriptionSchema } from "./subscriptions.schema";
import { subscriptionsService } from "./subscriptions.service";

const router = Router();
router.use(requireAuth);

router.get("/mine", async (req: Request, res: Response) => {
  const subs = await subscriptionsService.getMySubscriptions(req.user!.sub);
  res.json(subs);
});

router.post("/channels/:conversationId", validateUuidParam("conversationId"), validateBody(createSubscriptionSchema), async (req: Request, res: Response) => {
  const sub = await subscriptionsService.subscribe(req.user!.sub, req.params.conversationId, req.body.tier ?? "basic");
  res.status(201).json(sub);
});

router.delete("/channels/:conversationId", validateUuidParam("conversationId"), async (req: Request, res: Response) => {
  await subscriptionsService.unsubscribe(req.user!.sub, req.params.conversationId);
  res.status(204).send();
});

router.get("/channels/:conversationId/subscribers", validateUuidParam("conversationId"), async (req: Request, res: Response) => {
  const subs = await subscriptionsService.getChannelSubscribers(req.params.conversationId);
  res.json(subs);
});

router.get("/channels/:conversationId/stats", validateUuidParam("conversationId"), async (req: Request, res: Response) => {
  const stats = await subscriptionsService.getSubscriptionStats(req.params.conversationId);
  res.json(stats);
});

export { router as subscriptionsRouter };
