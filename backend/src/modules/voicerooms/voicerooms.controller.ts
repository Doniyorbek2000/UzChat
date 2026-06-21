import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { createVoiceRoomSchema } from "./voicerooms.schema";
import { voiceRoomsService } from "./voicerooms.service";

const router = Router();
router.use(requireAuth);

router.get("/live", async (_req: Request, res: Response) => {
  const rooms = await voiceRoomsService.listLive();
  res.json(rooms);
});

router.get("/scheduled", async (_req: Request, res: Response) => {
  const rooms = await voiceRoomsService.listScheduled();
  res.json(rooms);
});

router.post("/", validateBody(createVoiceRoomSchema), async (req: Request, res: Response) => {
  const room = await voiceRoomsService.createRoom(req.user!.sub, req.body);
  res.status(201).json(room);
});

router.get("/:roomId", async (req: Request, res: Response) => {
  const room = await voiceRoomsService.getRoom(req.params.roomId);
  res.json(room);
});

router.post("/:roomId/start", async (req: Request, res: Response) => {
  const room = await voiceRoomsService.startRoom(req.user!.sub, req.params.roomId);
  res.json(room);
});

router.post("/:roomId/end", async (req: Request, res: Response) => {
  const room = await voiceRoomsService.endRoom(req.user!.sub, req.params.roomId);
  res.json(room);
});

router.post("/:roomId/join", async (req: Request, res: Response) => {
  const participant = await voiceRoomsService.joinRoom(req.user!.sub, req.params.roomId);
  res.json(participant);
});

router.post("/:roomId/leave", async (req: Request, res: Response) => {
  const participant = await voiceRoomsService.leaveRoom(req.user!.sub, req.params.roomId);
  res.json(participant);
});

router.post("/:roomId/promote/:userId", async (req: Request, res: Response) => {
  const participant = await voiceRoomsService.promoteToSpeaker(
    req.user!.sub,
    req.params.roomId,
    req.params.userId,
  );
  res.json(participant);
});

router.post("/:roomId/demote/:userId", async (req: Request, res: Response) => {
  const participant = await voiceRoomsService.demoteToListener(
    req.user!.sub,
    req.params.roomId,
    req.params.userId,
  );
  res.json(participant);
});

router.post("/:roomId/toggle-mute", async (req: Request, res: Response) => {
  const participant = await voiceRoomsService.toggleMute(req.user!.sub, req.params.roomId);
  res.json(participant);
});

export { router as voiceRoomsRouter };
