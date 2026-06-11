import { Router } from "express";
import { reportsController } from "./reports.controller";
import { requireAuth } from "../../middleware/auth.middleware";
import { validateBody } from "../../utils/validate";
import { createReportSchema } from "./reports.schema";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

reportsRouter.post("/", validateBody(createReportSchema), reportsController.create);
