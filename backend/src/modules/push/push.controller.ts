import { Request, Response, NextFunction } from "express";
import { pushService } from "./push.service";
import { registerPushTokenSchema } from "./push.schema";

export const pushController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = registerPushTokenSchema.parse(req.body);
      await pushService.registerToken(req.user!.sub, token);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },

  async unregister(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = registerPushTokenSchema.parse(req.body);
      await pushService.removeToken(req.user!.sub, token);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
};
