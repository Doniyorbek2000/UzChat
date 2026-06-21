import { Request, Response } from "express";
import { foldersService } from "./folders.service";

export const foldersController = {
  async list(req: Request, res: Response) {
    const folders = await foldersService.list(req.user!.sub);
    res.json(folders);
  },

  async create(req: Request, res: Response) {
    const folder = await foldersService.create(req.user!.sub, req.body);
    res.status(201).json(folder);
  },

  async update(req: Request, res: Response) {
    const folder = await foldersService.update(req.user!.sub, req.params.id, req.body);
    res.json(folder);
  },

  async remove(req: Request, res: Response) {
    await foldersService.remove(req.user!.sub, req.params.id);
    res.status(204).send();
  },
};
