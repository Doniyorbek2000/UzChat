import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { autoReplyService } from "./autoreply.service";

export const autoReplySchema = z.object({
  enabled: z.boolean(),
  message: z.string().max(500),
  startTime: z.string().max(30).optional(),
  endTime: z.string().max(30).optional(),
});

const router = Router();
router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
  const ar = await autoReplyService.get(req.user!.sub);
  res.json(ar);
});

router.put("/", validateBody(autoReplySchema), async (req: Request, res: Response) => {
  const ar = await autoReplyService.upsert(req.user!.sub, req.body);
  res.json(ar);
});

export { router as autoReplyRouter };
