import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { createLiveStreamSchema } from "./livestream.schema";
import { liveStreamService } from "./livestream.service";

const router = Router();
router.use(requireAuth);

router.get("/active", async (req: Request, res: Response) => {
  const streams = await liveStreamService.listLive();
  res.json(streams);
});

router.get("/scheduled", async (req: Request, res: Response) => {
  const streams = await liveStreamService.listScheduled();
  res.json(streams);
});

router.post("/", validateBody(createLiveStreamSchema), async (req: Request, res: Response) => {
  const stream = await liveStreamService.createStream(req.user!.sub, req.body);
  res.status(201).json(stream);
});

router.get("/:streamId", async (req: Request, res: Response) => {
  const stream = await liveStreamService.getStream(req.params.streamId);
  res.json(stream);
});

router.post("/:streamId/start", async (req: Request, res: Response) => {
  const stream = await liveStreamService.startStream(req.user!.sub, req.params.streamId);
  res.json(stream);
});

router.post("/:streamId/end", async (req: Request, res: Response) => {
  const stream = await liveStreamService.endStream(req.user!.sub, req.params.streamId);
  res.json(stream);
});

router.post("/:streamId/view", async (req: Request, res: Response) => {
  await liveStreamService.recordView(req.params.streamId);
  res.status(204).send();
});

router.put("/:streamId/like", async (req: Request, res: Response) => {
  await liveStreamService.toggleLike(req.params.streamId);
  res.status(204).send();
});

export { router as liveStreamRouter };
