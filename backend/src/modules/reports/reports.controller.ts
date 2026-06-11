import { Request, Response, NextFunction } from "express";
import { reportsService } from "./reports.service";

export const reportsController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      await reportsService.create(req.user!.sub, req.body);
      res.status(201).send();
    } catch (err) {
      next(err);
    }
  },
};
