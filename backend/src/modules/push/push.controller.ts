import { Request, Response, NextFunction } from "express";
import { pushService } from "./push.service";

export const pushController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      await pushService.registerToken(req.user!.sub, req.body.token);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },

  async unregister(req: Request, res: Response, next: NextFunction) {
    try {
      await pushService.removeToken(req.user!.sub, req.body.token);
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  },
};
