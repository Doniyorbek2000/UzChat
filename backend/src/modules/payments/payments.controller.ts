import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { sendPaymentSchema, topUpSchema } from "./payments.schema";
import { paymentsService } from "./payments.service";

const router = Router();

router.use(requireAuth);

router.get("/balance", async (req: Request, res: Response) => {
  const balance = await paymentsService.getBalance(req.user!.sub);
  res.json(balance);
});

router.post("/top-up", validateBody(topUpSchema), async (req: Request, res: Response) => {
  const result = await paymentsService.topUp(req.user!.sub, req.body);
  res.json(result);
});

router.post("/send", validateBody(sendPaymentSchema), async (req: Request, res: Response) => {
  const payment = await paymentsService.sendPayment(req.user!.sub, req.body);
  res.status(201).json(payment);
});

router.get("/history", async (req: Request, res: Response) => {
  const history = await paymentsService.getHistory(req.user!.sub);
  res.json(history);
});

export { router as paymentsRouter };
