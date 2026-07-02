import { Router, Request, Response } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody, uuidParamHandler } from "../../utils/validate";
import { registerDeviceSchema, uploadPreKeysSchema, distributeSenderKeySchema, keyBackupSchema, rotatePublicKeySchema } from "./devices.schema";
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

router.put("/key-backup", validateBody(keyBackupSchema), async (req: Request, res: Response) => {
  const result = await devicesService.saveKeyBackup(req.user!.sub, req.body);
  res.json(result);
});

router.get("/key-backup", async (req: Request, res: Response) => {
  const backup = await devicesService.getKeyBackup(req.user!.sub);
  res.json(backup);
});

router.post("/rotate-public-key", validateBody(rotatePublicKeySchema), async (req: Request, res: Response) => {
  const result = await devicesService.rotatePublicKey(req.user!.sub, req.body.publicKey);
  res.json(result);
});

router.post("/:deviceId/prekeys", validateBody(uploadPreKeysSchema), async (req: Request, res: Response) => {
  const result = await devicesService.uploadPreKeys(req.user!.sub, req.params.deviceId, req.body);
  res.json(result);
});

router.get("/:deviceId/prekeys/count", async (req: Request, res: Response) => {
  const result = await devicesService.getPreKeyCount(req.user!.sub, req.params.deviceId);
  res.json(result);
});

router.get("/user/:userId/bundle", async (req: Request, res: Response) => {
  const bundles = await devicesService.getPreKeyBundles(req.params.userId);
  res.json(bundles);
});

router.get("/user/:userId/:deviceId/bundle", async (req: Request, res: Response) => {
  const bundle = await devicesService.getPreKeyBundle(req.params.userId, req.params.deviceId);
  res.json(bundle);
});

router.post("/:deviceId/senderkey", validateBody(distributeSenderKeySchema), async (req: Request, res: Response) => {
  const result = await devicesService.distributeSenderKey(req.user!.sub, req.params.deviceId, req.body);
  res.json(result);
});

router.get("/senderkeys/:conversationId", async (req: Request, res: Response) => {
  const keys = await devicesService.getSenderKeys(req.params.conversationId);
  res.json(keys);
});

router.get("/transparency/:userId", async (req: Request, res: Response) => {
  const log = await devicesService.getKeyTransparencyLog(req.params.userId);
  res.json(log);
});

export { router as devicesRouter };
