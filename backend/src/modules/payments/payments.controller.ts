import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { sendPaymentSchema, topUpSchema } from "./payments.schema";
import { createQrPaymentSchema, payQrSchema } from "./qrPayments.schema";
import { paymentsService } from "./payments.service";
import { qrPaymentsService } from "./qrPayments.service";
import { getIo } from "../../sockets";

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
  getIo().to(`user:${payment.receiverId}`).emit("payment:received", {
    id: payment.id,
    sender: payment.sender,
    amount: payment.amount,
    currency: payment.currency,
    note: payment.note,
  });
  res.status(201).json(payment);
});

router.get("/history", async (req: Request, res: Response) => {
  const history = await paymentsService.getHistory(req.user!.sub);
  res.json(history);
});

// QR Payments
router.post("/qr", validateBody(createQrPaymentSchema), async (req: Request, res: Response) => {
  const qr = await qrPaymentsService.create(req.user!.sub, req.body);
  res.status(201).json(qr);
});

router.get("/qr/mine", async (req: Request, res: Response) => {
  const list = await qrPaymentsService.listMine(req.user!.sub);
  res.json(list);
});

router.get("/qr/:qrCode", async (req: Request, res: Response) => {
  const qr = await qrPaymentsService.getByCode(req.params.qrCode);
  res.json(qr);
});

router.post("/qr/pay", validateBody(payQrSchema), async (req: Request, res: Response) => {
  const result = await qrPaymentsService.pay(req.user!.sub, req.body);
  getIo().to(`user:${result.creatorId}`).emit("qr-payment:completed", {
    id: result.id,
    payer: result.payer,
    amount: result.amount,
    currency: result.currency,
  });
  res.json(result);
});

router.delete("/qr/:qrPaymentId", async (req: Request, res: Response) => {
  await qrPaymentsService.cancel(req.user!.sub, req.params.qrPaymentId);
  res.status(204).send();
});

export { router as paymentsRouter };
