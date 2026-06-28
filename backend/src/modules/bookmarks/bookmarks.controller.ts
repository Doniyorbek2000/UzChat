import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, uuidParamHandler } from "../../utils/validate";
import { addBookmarkSchema } from "./bookmarks.schema";
import { bookmarksService } from "./bookmarks.service";

const router = Router();
router.use(requireAuth);
router.param("bookmarkId", uuidParamHandler);
router.param("messageId", uuidParamHandler);

router.get("/", async (req: Request, res: Response) => {
  const bookmarks = await bookmarksService.list(req.user!.sub);
  res.json(bookmarks);
});

router.post("/", validateBody(addBookmarkSchema), async (req: Request, res: Response) => {
  const bookmark = await bookmarksService.add(req.user!.sub, req.body.messageId, req.body.label);
  res.status(201).json(bookmark);
});

router.delete("/:bookmarkId", async (req: Request, res: Response) => {
  await bookmarksService.remove(req.user!.sub, req.params.bookmarkId);
  res.status(204).send();
});

router.delete("/message/:messageId", async (req: Request, res: Response) => {
  await bookmarksService.removeByMessage(req.user!.sub, req.params.messageId);
  res.status(204).send();
});

export { router as bookmarksRouter };
