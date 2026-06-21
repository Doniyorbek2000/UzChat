import { Request, Response } from "express";
import { reportsService } from "./reports.service";

export const reportsController = {
  async create(req: Request, res: Response) {
    await reportsService.create(req.user!.sub, req.body);
    res.status(201).send();
  },
};
