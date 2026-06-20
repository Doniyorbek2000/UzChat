import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { createRedPacketSchema } from "./redpackets.schema";
import { redPacketsService } from "./redpackets.service";
import { getIo } from "../../sockets";

const router = Router();

router.use(requireAuth);

router.post("/", validateBody(createRedPacketSchema), async (req: Request, res: Response) => {
  const packet = await redPacketsService.create(req.user!.sub, req.body);
  res.status(201).json(packet);
});

router.post("/:id/claim", async (req: Request, res: Response) => {
  const packet = await redPacketsService.claim(req.user!.sub, req.params.id);
  getIo().to(`user:${packet.senderId}`).emit("redpacket:claimed", {
    id: packet.id,
    claimedBy: packet.claimedBy,
    amount: packet.amount,
    currency: packet.currency,
  });
  res.json(packet);
});

router.get("/:id", async (req: Request, res: Response) => {
  const packet = await redPacketsService.getById(req.params.id);
  res.json(packet);
});

router.get("/history/sent", async (req: Request, res: Response) => {
  const packets = await redPacketsService.getMySent(req.user!.sub);
  res.json(packets);
});

router.get("/history/claimed", async (req: Request, res: Response) => {
  const packets = await redPacketsService.getMyClaimed(req.user!.sub);
  res.json(packets);
});

export { router as redPacketsRouter };
