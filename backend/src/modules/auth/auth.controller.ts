import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";

export const authController = {
  async requestOtp(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.requestRegistrationOtp(req.body);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.verifyOtpAndRegister(req.body, req.headers["user-agent"]);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.login(req.body, req.headers["user-agent"]);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async verifyTwoFactor(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.verifyTwoFactor(req.body, req.headers["user-agent"]);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authService.refresh(req.body.refreshToken, req.headers["user-agent"]);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      await authService.logout(req.body.refreshToken);
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
};
