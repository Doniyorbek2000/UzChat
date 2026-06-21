import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { draftsService } from "./drafts.service";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
  const drafts = await draftsService.list(req.user!.sub);
  res.json(drafts);
});

router.put("/:conversationId", async (req: Request, res: Response) => {
  const draft = await draftsService.upsert(req.user!.sub, req.params.conversationId, req.body.content, req.body.replyToId, req.body.attachments);
  res.json(draft);
});

router.delete("/:conversationId", async (req: Request, res: Response) => {
  await draftsService.delete(req.user!.sub, req.params.conversationId);
  res.status(204).send();
});

export { router as draftsRouter };
