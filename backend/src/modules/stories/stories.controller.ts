import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { createStorySchema } from "./stories.schema";
import { storiesService } from "./stories.service";

const router = Router();

router.use(requireAuth);

router.post("/", validateBody(createStorySchema), async (req: Request, res: Response) => {
  const story = await storiesService.createStory(req.user!.sub, req.body);
  res.status(201).json(story);
});

router.get("/feed", async (req: Request, res: Response) => {
  const feed = await storiesService.getFeed(req.user!.sub);
  res.json(feed);
});

router.post("/:storyId/view", async (req: Request, res: Response) => {
  await storiesService.viewStory(req.user!.sub, req.params.storyId);
  res.json({ success: true });
});

router.get("/:storyId/viewers", async (req: Request, res: Response) => {
  const viewers = await storiesService.getViewers(req.user!.sub, req.params.storyId);
  res.json(viewers);
});

router.delete("/:storyId", async (req: Request, res: Response) => {
  await storiesService.deleteStory(req.user!.sub, req.params.storyId);
  res.json({ success: true });
});

export { router as storiesRouter };
