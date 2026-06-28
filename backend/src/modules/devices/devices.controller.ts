import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, uuidParamHandler } from "../../utils/validate";
import { registerDeviceSchema } from "./devices.schema";
import { devicesService } from "./devices.service";

const router = Router();

router.use(requireAuth);
router.param("deviceId", uuidParamHandler);
router.param("userId", uuidParamHandler);

router.post("/", validateBody(registerDeviceSchema), async (req: Request, res: Response) => {
  const device = await devicesService.registerDevice(req.user!.sub, req.body);
  res.status(201).json(device);
});

router.get("/", async (req: Request, res: Response) => {
  const devices = await devicesService.listDevices(req.user!.sub);
  res.json(devices);
});

router.get("/user/:userId", async (req: Request, res: Response) => {
  const keys = await devicesService.getDeviceKeys(req.params.userId);
  res.json(keys);
});

router.delete("/:deviceId", async (req: Request, res: Response) => {
  await devicesService.removeDevice(req.user!.sub, req.params.deviceId);
  res.status(204).send();
});

export { router as devicesRouter };
