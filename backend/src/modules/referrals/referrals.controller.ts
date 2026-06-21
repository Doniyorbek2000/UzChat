import { Router, Request, Response } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { referralsService } from "./referrals.service";

const claimSchema = z.object({ code: z.string().min(1).max(64) });

const router = Router();
router.use(requireAuth);

router.get("/code", async (req: Request, res: Response) => {
  const code = await referralsService.generateCode(req.user!.sub);
  res.json(code);
});

router.post("/claim", validateBody(claimSchema), async (req: Request, res: Response) => {
  const referral = await referralsService.claimReferral(req.user!.sub, req.body.code);
  res.status(201).json(referral);
});

router.get("/mine", async (req: Request, res: Response) => {
  const referrals = await referralsService.getMyReferrals(req.user!.sub);
  res.json(referrals);
});

router.get("/stats", async (req: Request, res: Response) => {
  const stats = await referralsService.getReferralStats(req.user!.sub);
  res.json(stats);
});

export { router as referralsRouter };
