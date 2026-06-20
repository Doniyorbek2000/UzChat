import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";
import {
  requestOtpSchema,
  verifyOtpSchema,
  loginSchema,
  refreshSchema,
  verifyTwoFactorSchema,
  requestPhoneChangeSchema,
  verifyPhoneChangeSchema,
  requestTwoFactorRecoverySchema,
  verifyTwoFactorRecoverySchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from "./auth.schema";

export const authController = {
  async checkUsername(req: Request, res: Response, next: NextFunction) {
    try {
      const username = String(req.query.username ?? "");
      const available = await authService.isUsernameAvailable(username);
      res.json({ available });
    } catch (err) {
      next(err);
    }
  },

  async requestOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const input = requestOtpSchema.parse(req.body);
      await authService.requestRegistrationOtp(input);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const input = verifyOtpSchema.parse(req.body);
      const result = await authService.verifyOtpAndRegister(input, req.headers["user-agent"]);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const input = loginSchema.parse(req.body);
      const result = await authService.login(input, req.headers["user-agent"]);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async verifyTwoFactor(req: Request, res: Response, next: NextFunction) {
    try {
      const input = verifyTwoFactorSchema.parse(req.body);
      const result = await authService.verifyTwoFactor(input, req.headers["user-agent"]);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      const result = await authService.refresh(refreshToken, req.headers["user-agent"]);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = refreshSchema.parse(req.body);
      await authService.logout(refreshToken);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async listSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const sessions = await authService.listSessions(req.user!.sub, req.user!.sid);
      res.json(sessions);
    } catch (err) {
      next(err);
    }
  },

  async revokeSession(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.revokeSession(req.user!.sub, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async revokeOtherSessions(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.revokeOtherSessions(req.user!.sub, req.user!.sid);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async requestPhoneChange(req: Request, res: Response, next: NextFunction) {
    try {
      const input = requestPhoneChangeSchema.parse(req.body);
      await authService.requestPhoneChange(req.user!.sub, input);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async verifyPhoneChange(req: Request, res: Response, next: NextFunction) {
    try {
      const input = verifyPhoneChangeSchema.parse(req.body);
      const result = await authService.verifyPhoneChange(req.user!.sub, input);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async requestTwoFactorRecovery(req: Request, res: Response, next: NextFunction) {
    try {
      const { pendingToken } = requestTwoFactorRecoverySchema.parse(req.body);
      await authService.requestTwoFactorRecovery(pendingToken);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async recoverTwoFactor(req: Request, res: Response, next: NextFunction) {
    try {
      const input = verifyTwoFactorRecoverySchema.parse(req.body);
      const result = await authService.recoverTwoFactor(input, req.headers["user-agent"]);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async requestPasswordReset(req: Request, res: Response, next: NextFunction) {
    try {
      const input = requestPasswordResetSchema.parse(req.body);
      await authService.requestPasswordReset(input);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const input = resetPasswordSchema.parse(req.body);
      await authService.resetPassword(input);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
