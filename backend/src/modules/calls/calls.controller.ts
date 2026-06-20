import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { callsService } from "./calls.service";

const router = Router();

router.use(requireAuth);

router.get("/history", async (req: Request, res: Response) => {
  const history = await callsService.getHistory(req.user!.sub);
  res.json(history);
});

export { router as callsRouter };
