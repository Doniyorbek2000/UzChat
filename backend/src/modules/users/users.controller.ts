import { Request, Response, NextFunction } from "express";
import { usersService } from "./users.service";
import { chatsService } from "../chats/chats.service";
import { getIo } from "../../sockets";

export const usersController = {
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await usersService.getOwnProfile(req.user!.sub);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },

  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await usersService.updateProfile(req.user!.sub, req.body);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },

  async getUsernameHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const history = await usersService.getUsernameHistory(req.user!.sub);
      res.json(history);
    } catch (err) {
      next(err);
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      await usersService.changePassword(req.user!.sub, req.user!.sid, req.body);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async setTwoFactor(req: Request, res: Response, next: NextFunction) {
    try {
      await usersService.setTwoFactor(req.user!.sub, req.body);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async disableTwoFactor(req: Request, res: Response, next: NextFunction) {
    try {
      await usersService.disableTwoFactor(req.user!.sub, req.body);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.sub;
      const { leaveResults } = await usersService.deleteAccount(userId, req.body);

      for (const result of leaveResults) {
        if (result.deleted) {
          getIo().to(`conversation:${result.conversationId}`).emit("conversation:deleted", {
            conversationId: result.conversationId,
          });
          continue;
        }

        getIo()
          .to(`conversation:${result.conversationId}`)
          .emit("conversation:participantRemoved", { conversationId: result.conversationId, userId });

        if (result.newOwnerId) {
          const conversation = await chatsService.getConversation(result.newOwnerId, result.conversationId);
          getIo().to(`conversation:${result.conversationId}`).emit("conversation:updated", conversation);
        }
      }

      getIo().in(`user:${userId}`).disconnectSockets(true);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const profile = await usersService.getPublicProfile(req.user!.sub, req.params.id);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },

  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const query = String(req.query.q ?? "");
      const users = await usersService.searchUsers(req.user!.sub, query);
      res.json(users);
    } catch (err) {
      next(err);
    }
  },

  async notifyOnline(req: Request, res: Response, next: NextFunction) {
    try {
      await usersService.subscribeOnlineNotify(req.user!.sub, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async cancelNotifyOnline(req: Request, res: Response, next: NextFunction) {
    try {
      await usersService.unsubscribeOnlineNotify(req.user!.sub, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async listLastSeenExceptions(req: Request, res: Response, next: NextFunction) {
    try {
      const exceptions = await usersService.listLastSeenExceptions(req.user!.sub);
      res.json(exceptions);
    } catch (err) {
      next(err);
    }
  },

  async setLastSeenException(req: Request, res: Response, next: NextFunction) {
    try {
      await usersService.setLastSeenException(req.user!.sub, req.params.id, req.body);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async removeLastSeenException(req: Request, res: Response, next: NextFunction) {
    try {
      await usersService.removeLastSeenException(req.user!.sub, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
