import { Request, Response } from "express";
import { pushService } from "./push.service";

export const pushController = {
  async register(req: Request, res: Response) {
    await pushService.registerToken(req.user!.sub, req.body.token);
    res.status(204).end();
  },

  async unregister(req: Request, res: Response) {
    await pushService.removeToken(req.user!.sub, req.body.token);
    res.status(204).end();
  },
};
