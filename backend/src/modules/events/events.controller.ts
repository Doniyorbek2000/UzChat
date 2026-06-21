import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { createEventSchema, updateEventSchema, rsvpSchema } from "./events.schema";
import { eventsService } from "./events.service";

const router = Router();
router.use(requireAuth);

router.get("/upcoming", async (req: Request, res: Response) => {
  const events = await eventsService.getUpcoming(req.user!.sub);
  res.json(events);
});

router.get("/conversations/:conversationId", async (req: Request, res: Response) => {
  const events = await eventsService.listByConversation(req.params.conversationId);
  res.json(events);
});

router.post("/conversations/:conversationId", validateBody(createEventSchema), async (req: Request, res: Response) => {
  const event = await eventsService.createEvent(req.user!.sub, req.params.conversationId, req.body);
  res.status(201).json(event);
});

router.patch("/:eventId", validateBody(updateEventSchema), async (req: Request, res: Response) => {
  const event = await eventsService.updateEvent(req.user!.sub, req.params.eventId, req.body);
  res.json(event);
});

router.delete("/:eventId", async (req: Request, res: Response) => {
  await eventsService.deleteEvent(req.user!.sub, req.params.eventId);
  res.status(204).send();
});

router.post("/:eventId/rsvp", validateBody(rsvpSchema), async (req: Request, res: Response) => {
  const rsvp = await eventsService.rsvp(req.user!.sub, req.params.eventId, req.body.status);
  res.json(rsvp);
});

router.get("/:eventId/rsvps", async (req: Request, res: Response) => {
  const rsvps = await eventsService.getRsvps(req.params.eventId);
  res.json(rsvps);
});

export { router as eventsRouter };
