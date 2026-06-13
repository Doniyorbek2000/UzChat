import { Request, Response, NextFunction } from "express";
import { broadcastsService } from "./broadcasts.service";

export const broadcastsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const lists = await broadcastsService.list(req.user!.sub);
      res.json(lists);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await broadcastsService.create(req.user!.sub, req.body);
      res.status(201).json(list);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await broadcastsService.update(req.user!.sub, req.params.id, req.body);
      res.json(list);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await broadcastsService.remove(req.user!.sub, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
