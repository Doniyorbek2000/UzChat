import { Request, Response, NextFunction } from "express";
import path from "path";
import { env } from "../../config/env";
import { Errors } from "../../utils/errors";
import { uploadsDir } from "./upload";

export const mediaController = {
  async upload(req: Request, res: Response) {
    if (!req.file) throw Errors.badRequest("Fayl yuborilmadi");
    res.status(201).json({
      url: `${env.publicUrl}/media/${req.file.filename}`,
      size: req.file.size,
    });
  },

  async get(req: Request, res: Response, next: NextFunction) {
    const filename = path.basename(req.params.filename);
    res.set("Cache-Control", "private, max-age=31536000, immutable");
    res.sendFile(path.join(uploadsDir, filename), (err) => {
      if (err) next(Errors.notFound("Fayl"));
    });
  },
};
