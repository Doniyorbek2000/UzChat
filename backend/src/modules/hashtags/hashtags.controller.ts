import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { hashtagsService } from "./hashtags.service";

const r = Router();
r.use(requireAuth);

r.get("/trending", async (_req, res) => {
  const tags = await hashtagsService.getTrending();
  res.json(tags);
});

r.get("/search", async (req, res) => {
  const q = String(req.query.q || "");
  const tags = await hashtagsService.search(q);
  res.json(tags);
});

r.get("/tag/:tag/posts", async (req, res) => {
  const cursor = req.query.cursor as string | undefined;
  const result = await hashtagsService.getPostsByHashtag(req.params.tag, cursor);
  res.json(result);
});

export const hashtagsRouter = r;
