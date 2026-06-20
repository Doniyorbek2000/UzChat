import { Request, Response, NextFunction } from "express";
import { reportsService } from "./reports.service";
import { createReportSchema } from "./reports.schema";

export const reportsController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const input = createReportSchema.parse(req.body);
      await reportsService.create(req.user!.sub, input);
      res.status(201).send();
    } catch (err) {
      next(err);
    }
  },
};
