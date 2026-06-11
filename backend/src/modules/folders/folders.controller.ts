import { Request, Response, NextFunction } from "express";
import { foldersService } from "./folders.service";

export const foldersController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const folders = await foldersService.list(req.user!.sub);
      res.json(folders);
    } catch (err) {
      next(err);
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const folder = await foldersService.create(req.user!.sub, req.body);
      res.status(201).json(folder);
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const folder = await foldersService.update(req.user!.sub, req.params.id, req.body);
      res.json(folder);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await foldersService.remove(req.user!.sub, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
