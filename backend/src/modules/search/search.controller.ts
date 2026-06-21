import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateQuery } from "../../utils/validate";
import { searchQuerySchema } from "./search.schema";
import { searchService } from "./search.service";

const router = Router();
router.use(requireAuth);

router.get("/", validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  const { q, type, conversationId, limit = 20, offset = 0 } = req.query as any;
  const userId = req.user!.sub;

  const results: any = {};

  if (!type || type === "users") {
    results.users = await searchService.searchUsers(q, limit, offset);
  }
  if (!type || type === "groups") {
    results.groups = await searchService.searchGroups(q, limit, offset);
  }
  if (!type || type === "channels") {
    results.channels = await searchService.searchChannels(q, limit, offset);
  }
  if (!type || type === "messages") {
    results.messages = await searchService.searchMessages(userId, q, conversationId, limit, offset);
  }

  await searchService.saveSearchHistory(userId, q, type ?? "all");
  res.json(results);
});

router.get("/history", async (req: Request, res: Response) => {
  const history = await searchService.getSearchHistory(req.user!.sub);
  res.json(history);
});

router.delete("/history", async (req: Request, res: Response) => {
  await searchService.clearSearchHistory(req.user!.sub);
  res.status(204).send();
});

export { router as searchRouter };
