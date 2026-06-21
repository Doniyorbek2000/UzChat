import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, validateQuery, uuidParamHandler } from "../../utils/validate";
import { createPostSchema, createCommentSchema, paginationQuery } from "./feed.schema";
import { feedService } from "./feed.service";

const router = Router();

router.use(requireAuth);
router.param("postId", uuidParamHandler);
router.param("userId", uuidParamHandler);
router.param("commentId", uuidParamHandler);

router.post("/", validateBody(createPostSchema), async (req: Request, res: Response) => {
  const post = await feedService.createPost(req.user!.sub, req.body);
  res.status(201).json(post);
});

router.get("/", validateQuery(paginationQuery), async (req: Request, res: Response) => {
  const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
  const result = await feedService.getFeed(req.user!.sub, cursor, limit);
  res.json(result);
});

router.get("/user/:userId", validateQuery(paginationQuery), async (req: Request, res: Response) => {
  const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
  const result = await feedService.getUserPosts(req.params.userId, req.user!.sub, cursor, limit);
  res.json(result);
});

router.post("/:postId/like", async (req: Request, res: Response) => {
  const result = await feedService.likePost(req.user!.sub, req.params.postId);
  res.json(result);
});

router.delete("/:postId/like", async (req: Request, res: Response) => {
  const result = await feedService.unlikePost(req.user!.sub, req.params.postId);
  res.json(result);
});

router.get("/:postId/comments", validateQuery(paginationQuery), async (req: Request, res: Response) => {
  const { cursor, limit } = req.query as unknown as { cursor?: string; limit: number };
  const result = await feedService.getComments(req.params.postId, cursor, limit);
  res.json(result);
});

router.post("/:postId/comments", validateBody(createCommentSchema), async (req: Request, res: Response) => {
  const comment = await feedService.addComment(req.user!.sub, req.params.postId, req.body.content);
  res.status(201).json(comment);
});

router.delete("/:postId", async (req: Request, res: Response) => {
  await feedService.deletePost(req.user!.sub, req.params.postId);
  res.status(204).send();
});

router.delete("/comments/:commentId", async (req: Request, res: Response) => {
  await feedService.deleteComment(req.user!.sub, req.params.commentId);
  res.status(204).send();
});

export { router as feedRouter };
