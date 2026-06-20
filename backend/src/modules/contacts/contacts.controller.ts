import { Request, Response, NextFunction } from "express";
import { contactsService } from "./contacts.service";
import { getIo } from "../../sockets";
import { addContactSchema, updateContactSchema } from "./contacts.schema";

export const contactsController = {
  async sendRequest(req: Request, res: Response, next: NextFunction) {
    try {
      const { username } = addContactSchema.parse(req.body);
      const contact = await contactsService.sendRequest(req.user!.sub, username);
      getIo().to(`user:${contact.targetId}`).emit("contact:request");
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

  async listOutgoing(req: Request, res: Response, next: NextFunction) {
    try {
      const requests = await contactsService.listOutgoingRequests(req.user!.sub);
      res.json(requests);
    } catch (err) {
      next(err);
    }
  },

  async accept(req: Request, res: Response, next: NextFunction) {
    try {
      const { ownerId } = await contactsService.acceptRequest(req.user!.sub, req.params.requestId);
      // Reuse "contact:request" to tell the requester's Contacts screen to
      // refresh - their outgoing request just got resolved.
      getIo().to(`user:${ownerId}`).emit("contact:request");
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async decline(req: Request, res: Response, next: NextFunction) {
    try {
      const { ownerId } = await contactsService.declineRequest(req.user!.sub, req.params.requestId);
      getIo().to(`user:${ownerId}`).emit("contact:request");
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

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const input = updateContactSchema.parse(req.body);
      const result = await contactsService.updateContact(req.user!.sub, req.params.contactId, input);
      res.json(result);
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

  async listSuggestions(req: Request, res: Response, next: NextFunction) {
    try {
      const suggestions = await contactsService.listSuggestions(req.user!.sub);
      res.json(suggestions);
    } catch (err) {
      next(err);
    }
  },

  async dismissSuggestion(req: Request, res: Response, next: NextFunction) {
    try {
      await contactsService.dismissSuggestion(req.user!.sub, req.params.userId);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async listUpcomingBirthdays(req: Request, res: Response, next: NextFunction) {
    try {
      const birthdays = await contactsService.listUpcomingBirthdays(req.user!.sub);
      res.json(birthdays);
    } catch (err) {
      next(err);
    }
  },

  async listMutual(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await contactsService.listMutualContacts(req.user!.sub, req.params.userId);
      res.json(users);
    } catch (err) {
      next(err);
    }
  },
};
