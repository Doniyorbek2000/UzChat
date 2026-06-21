import { Request, Response } from "express";
import { broadcastsService } from "./broadcasts.service";

export const broadcastsController = {
  async list(req: Request, res: Response) {
    const lists = await broadcastsService.list(req.user!.sub);
    res.json(lists);
  },

  async create(req: Request, res: Response) {
    const list = await broadcastsService.create(req.user!.sub, req.body);
    res.status(201).json(list);
  },

  async update(req: Request, res: Response) {
    const list = await broadcastsService.update(req.user!.sub, req.params.id, req.body);
    res.json(list);
  },

  async remove(req: Request, res: Response) {
    await broadcastsService.remove(req.user!.sub, req.params.id);
    res.status(204).send();
  },
};
