import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { createReelSchema, reelCommentSchema } from "./reels.schema";
import { reelsService } from "./reels.service";

const router = Router();
router.use(requireAuth);

router.get("/feed", async (req: Request, res: Response) => {
  const reels = await reelsService.getFeed(req.user!.sub, req.query.cursor as string | undefined);
  res.json(reels);
});

router.get("/trending", async (req: Request, res: Response) => {
  const reels = await reelsService.getTrending();
  res.json(reels);
});

router.get("/user/:userId", async (req: Request, res: Response) => {
  const reels = await reelsService.getByUser(req.params.userId, req.user!.sub);
  res.json(reels);
});

router.post("/", validateBody(createReelSchema), async (req: Request, res: Response) => {
  const reel = await reelsService.create(req.user!.sub, req.body);
  res.status(201).json(reel);
});

router.get("/:reelId", async (req: Request, res: Response) => {
  const reel = await reelsService.getReel(req.params.reelId, req.user!.sub);
  res.json(reel);
});

router.post("/:reelId/view", async (req: Request, res: Response) => {
  await reelsService.view(req.params.reelId);
  res.status(204).send();
});

router.put("/:reelId/like", async (req: Request, res: Response) => {
  const result = await reelsService.toggleLike(req.user!.sub, req.params.reelId);
  res.json(result);
});

router.get("/:reelId/comments", async (req: Request, res: Response) => {
  const comments = await reelsService.getComments(req.params.reelId, req.query.cursor as string | undefined);
  res.json(comments);
});

router.post("/:reelId/comments", validateBody(reelCommentSchema), async (req: Request, res: Response) => {
  const comment = await reelsService.addComment(req.user!.sub, req.params.reelId, req.body);
  res.status(201).json(comment);
});

router.delete("/comments/:commentId", async (req: Request, res: Response) => {
  await reelsService.deleteComment(req.user!.sub, req.params.commentId);
  res.status(204).send();
});

router.delete("/:reelId", async (req: Request, res: Response) => {
  await reelsService.deleteReel(req.user!.sub, req.params.reelId);
  res.status(204).send();
});

export { router as reelsRouter };
