import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { Errors } from "../utils/errors";

export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const userId = req.user?.sub;
  if (!userId) throw Errors.forbidden("Avtorizatsiya kerak");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) throw Errors.forbidden("Admin huquqi kerak");
  next();
}
