import { Router } from "express";
import { authController } from "./auth.controller";
import { validateBody } from "../../utils/validate";
import { loginSchema, refreshSchema, requestOtpSchema, verifyOtpSchema } from "./auth.schema";
import { authRateLimiter } from "../../middleware/rateLimit.middleware";

export const authRouter = Router();

authRouter.post(
  "/register/request-otp",
  authRateLimiter,
  validateBody(requestOtpSchema),
  authController.requestOtp
);
authRouter.post(
  "/register/verify-otp",
  authRateLimiter,
  validateBody(verifyOtpSchema),
  authController.verifyOtp
);
authRouter.post("/login", authRateLimiter, validateBody(loginSchema), authController.login);
authRouter.post("/refresh", validateBody(refreshSchema), authController.refresh);
authRouter.post("/logout", validateBody(refreshSchema), authController.logout);
