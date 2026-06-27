import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, validateUuidParam } from "../../utils/validate";
import { draftsService } from "./drafts.service";

export const upsertDraftSchema = z.object({
  content: z.string().max(10000).optional(),
  replyToId: z.string().uuid().optional(),
  attachments: z.array(z.object({
    type: z.string().max(50),
    url: z.string().url().max(2000),
    name: z.string().max(255).optional(),
  })).max(20).optional(),
});

const router = Router();
router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
  const drafts = await draftsService.list(req.user!.sub);
  res.json(drafts);
});

router.put("/:conversationId", validateUuidParam("conversationId"), validateBody(upsertDraftSchema), async (req: Request, res: Response) => {
  const { content, replyToId, attachments } = req.body;
  const draft = await draftsService.upsert(req.user!.sub, req.params.conversationId, content, replyToId, attachments);
  res.json(draft);
});

router.delete("/:conversationId", validateUuidParam("conversationId"), async (req: Request, res: Response) => {
  await draftsService.delete(req.user!.sub, req.params.conversationId);
  res.status(204).send();
});

export { router as draftsRouter };
