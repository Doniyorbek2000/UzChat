import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, uuidParamHandler } from "../../utils/validate";
import { createTopicSchema, updateTopicSchema } from "./forums.schema";
import { forumsService } from "./forums.service";

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.param("id", uuidParamHandler);
router.param("topicId", uuidParamHandler);

router.get("/conversations/:id/topics", async (req: Request, res: Response) => {
  const topics = await forumsService.listTopics(req.params.id);
  res.json(topics);
});

router.post("/conversations/:id/topics", validateBody(createTopicSchema), async (req: Request, res: Response) => {
  const topic = await forumsService.createTopic(req.user!.sub, req.params.id, req.body);
  res.status(201).json(topic);
});

router.patch("/conversations/:id/topics/:topicId", validateBody(updateTopicSchema), async (req: Request, res: Response) => {
  const topic = await forumsService.updateTopic(req.user!.sub, req.params.id, req.params.topicId, req.body);
  res.json(topic);
});

router.delete("/conversations/:id/topics/:topicId", async (req: Request, res: Response) => {
  await forumsService.deleteTopic(req.user!.sub, req.params.id, req.params.topicId);
  res.status(204).send();
});

router.get("/topics/:topicId", async (req: Request, res: Response) => {
  const topic = await forumsService.getTopic(req.params.topicId);
  res.json(topic);
});

export { router as forumsRouter };
