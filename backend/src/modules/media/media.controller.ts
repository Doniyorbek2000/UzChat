import { Request, Response } from "express";
import path from "path";
import { Errors } from "../../utils/errors";
import { storage } from "../../services/storage.service";
import { finalizeUpload } from "./upload";

export const mediaController = {
  async upload(req: Request, res: Response) {
    if (!req.file) throw Errors.badRequest("Fayl yuborilmadi");
    const stored = await finalizeUpload(req.file);
    res.status(201).json(stored);
  },

  async get(req: Request, res: Response) {
    const filename = path.basename(req.params.filename);
    const file = await storage.download(filename);
    if (!file) throw Errors.notFound("Fayl");

    res.set("Cache-Control", "private, max-age=31536000, immutable");
    if (file.contentType) res.set("Content-Type", file.contentType);
    else if (path.extname(filename)) res.type(path.extname(filename));
    if (file.contentLength !== undefined) res.set("Content-Length", String(file.contentLength));
    file.stream.on("error", () => {
      if (!res.headersSent) res.status(404).end();
      else res.destroy();
    });
    file.stream.pipe(res);
  },
};
