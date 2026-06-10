import { Request, Response, NextFunction } from "express";
import { contactsService } from "./contacts.service";

export const contactsController = {
  async sendRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const contact = await contactsService.sendRequest(req.user!.sub, req.body.username);
      res.status(201).json(contact);
    } catch (err) {
      next(err);
    }
  },

  async listIncoming(req: Request, res: Response, next: NextFunction) {
    try {
      const requests = await contactsService.listIncomingRequests(req.user!.sub);
      res.json(requests);
    } catch (err) {
      next(err);
    }
  },

  async accept(req: Request, res: Response, next: NextFunction) {
    try {
      await contactsService.acceptRequest(req.user!.sub, req.params.requestId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async decline(req: Request, res: Response, next: NextFunction) {
    try {
      await contactsService.declineRequest(req.user!.sub, req.params.requestId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const contacts = await contactsService.listContacts(req.user!.sub);
      res.json(contacts);
    } catch (err) {
      next(err);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await contactsService.removeContact(req.user!.sub, req.params.contactId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async block(req: Request, res: Response, next: NextFunction) {
    try {
      await contactsService.blockUser(req.user!.sub, req.params.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async unblock(req: Request, res: Response, next: NextFunction) {
    try {
      await contactsService.unblockUser(req.user!.sub, req.params.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async listBlocked(req: Request, res: Response, next: NextFunction) {
    try {
      const blocked = await contactsService.listBlocked(req.user!.sub);
      res.json(blocked);
    } catch (err) {
      next(err);
    }
  },
};
