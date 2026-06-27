import { Request, Response } from "express";
import { authService } from "./auth.service";

export const authController = {
  async checkUsername(req: Request, res: Response) {
    const username = String(req.query.username ?? "");
    const available = await authService.isUsernameAvailable(username);
    res.json({ available });
  },

  async requestOtp(req: Request, res: Response) {
    await authService.requestRegistrationOtp(req.body);
    res.status(204).send();
  },

  async verifyOtp(req: Request, res: Response) {
    const result = await authService.verifyOtpAndRegister(req.body, req.headers["user-agent"]);
    res.status(201).json(result);
  },

  async requestLoginOtp(req: Request, res: Response) {
    await authService.requestLoginOtp(req.body);
    res.status(204).send();
  },

  async verifyLoginOtp(req: Request, res: Response) {
    const result = await authService.verifyLoginOtp(req.body, req.headers["user-agent"]);
    res.json(result);
  },

  async login(req: Request, res: Response) {
    const ip = req.ip ?? req.socket.remoteAddress ?? null;
    const result = await authService.login(req.body, req.headers["user-agent"], ip);
    res.json(result);
  },

  async verifyTwoFactor(req: Request, res: Response) {
    const result = await authService.verifyTwoFactor(req.body, req.headers["user-agent"]);
    res.json(result);
  },

  async refresh(req: Request, res: Response) {
    const result = await authService.refresh(req.body.refreshToken, req.headers["user-agent"]);
    res.json(result);
  },

  async logout(req: Request, res: Response) {
    await authService.logout(req.body.refreshToken);
    res.status(204).send();
  },

  async listSessions(req: Request, res: Response) {
    const sessions = await authService.listSessions(req.user!.sub, req.user!.sid);
    res.json(sessions);
  },

  async revokeSession(req: Request, res: Response) {
    await authService.revokeSession(req.user!.sub, req.params.id);
    res.status(204).send();
  },

  async revokeOtherSessions(req: Request, res: Response) {
    await authService.revokeOtherSessions(req.user!.sub, req.user!.sid);
    res.status(204).send();
  },

  async requestPhoneChange(req: Request, res: Response) {
    await authService.requestPhoneChange(req.user!.sub, req.body);
    res.status(204).send();
  },

  async verifyPhoneChange(req: Request, res: Response) {
    const result = await authService.verifyPhoneChange(req.user!.sub, req.body);
    res.json(result);
  },

  async requestTwoFactorRecovery(req: Request, res: Response) {
    await authService.requestTwoFactorRecovery(req.body.pendingToken);
    res.status(204).send();
  },

  async recoverTwoFactor(req: Request, res: Response) {
    const result = await authService.recoverTwoFactor(req.body, req.headers["user-agent"]);
    res.json(result);
  },

  async requestPasswordReset(req: Request, res: Response) {
    await authService.requestPasswordReset(req.body);
    res.status(204).send();
  },

  async resetPassword(req: Request, res: Response) {
    await authService.resetPassword(req.body);
    res.status(204).send();
  },
};
