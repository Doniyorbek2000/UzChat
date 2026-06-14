import { Router } from "express";
import { authController } from "./auth.controller";
import { validateBody } from "../../utils/validate";
import {
  loginSchema,
  refreshSchema,
  requestOtpSchema,
  requestPasswordResetSchema,
  requestPhoneChangeSchema,
  requestTwoFactorRecoverySchema,
  resetPasswordSchema,
  verifyOtpSchema,
  verifyPhoneChangeSchema,
  verifyTwoFactorRecoverySchema,
  verifyTwoFactorSchema,
} from "./auth.schema";
import { authRateLimiter, apiRateLimiter } from "../../middleware/rateLimit.middleware";
import { requireAuth } from "../../middleware/auth.middleware";

export const authRouter = Router();

authRouter.get("/check-username", apiRateLimiter, authController.checkUsername);

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
authRouter.post(
  "/login/2fa",
  authRateLimiter,
  validateBody(verifyTwoFactorSchema),
  authController.verifyTwoFactor
);
authRouter.post(
  "/login/2fa/recover/request-otp",
  authRateLimiter,
  validateBody(requestTwoFactorRecoverySchema),
  authController.requestTwoFactorRecovery
);
authRouter.post(
  "/login/2fa/recover/verify-otp",
  authRateLimiter,
  validateBody(verifyTwoFactorRecoverySchema),
  authController.recoverTwoFactor
);
authRouter.post("/refresh", validateBody(refreshSchema), authController.refresh);
authRouter.post("/logout", validateBody(refreshSchema), authController.logout);

authRouter.post(
  "/reset-password/request-otp",
  authRateLimiter,
  validateBody(requestPasswordResetSchema),
  authController.requestPasswordReset
);
authRouter.post(
  "/reset-password/verify-otp",
  authRateLimiter,
  validateBody(resetPasswordSchema),
  authController.resetPassword
);

authRouter.get("/sessions", requireAuth, authController.listSessions);
authRouter.delete("/sessions/:id", requireAuth, authController.revokeSession);
authRouter.post("/sessions/revoke-others", requireAuth, authController.revokeOtherSessions);

authRouter.post(
  "/change-phone/request-otp",
  requireAuth,
  authRateLimiter,
  validateBody(requestPhoneChangeSchema),
  authController.requestPhoneChange
);
authRouter.post(
  "/change-phone/verify-otp",
  requireAuth,
  authRateLimiter,
  validateBody(verifyPhoneChangeSchema),
  authController.verifyPhoneChange
);
