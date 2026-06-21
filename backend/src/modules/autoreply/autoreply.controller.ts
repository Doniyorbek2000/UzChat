import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { autoReplyService } from "./autoreply.service";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
  const ar = await autoReplyService.get(req.user!.sub);
  res.json(ar);
});

router.put("/", async (req: Request, res: Response) => {
  const ar = await autoReplyService.upsert(req.user!.sub, req.body);
  res.json(ar);
});

export { router as autoReplyRouter };
