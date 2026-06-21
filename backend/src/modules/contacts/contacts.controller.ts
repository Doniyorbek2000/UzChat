import { Request, Response } from "express";
import { contactsService } from "./contacts.service";
import { getIo } from "../../sockets";

export const contactsController = {
  async sendRequest(req: Request, res: Response) {
    const contact = await contactsService.sendRequest(req.user!.sub, req.body.username);
    getIo().to(`user:${contact.targetId}`).emit("contact:request");
    res.status(201).json(contact);
  },

  async listIncoming(req: Request, res: Response) {
    const requests = await contactsService.listIncomingRequests(req.user!.sub);
    res.json(requests);
  },

  async listOutgoing(req: Request, res: Response) {
    const requests = await contactsService.listOutgoingRequests(req.user!.sub);
    res.json(requests);
  },

  async accept(req: Request, res: Response) {
    const { ownerId } = await contactsService.acceptRequest(req.user!.sub, req.params.requestId);
    getIo().to(`user:${ownerId}`).emit("contact:request");
    res.status(204).send();
  },

  async decline(req: Request, res: Response) {
    const { ownerId } = await contactsService.declineRequest(req.user!.sub, req.params.requestId);
    getIo().to(`user:${ownerId}`).emit("contact:request");
    res.status(204).send();
  },

  async list(req: Request, res: Response) {
    const contacts = await contactsService.listContacts(req.user!.sub);
    res.json(contacts);
  },

  async remove(req: Request, res: Response) {
    await contactsService.removeContact(req.user!.sub, req.params.contactId);
    res.status(204).send();
  },

  async update(req: Request, res: Response) {
    const result = await contactsService.updateContact(req.user!.sub, req.params.contactId, req.body);
    res.json(result);
  },

  async block(req: Request, res: Response) {
    await contactsService.blockUser(req.user!.sub, req.params.userId);
    res.status(204).send();
  },

  async unblock(req: Request, res: Response) {
    await contactsService.unblockUser(req.user!.sub, req.params.userId);
    res.status(204).send();
  },

  async listBlocked(req: Request, res: Response) {
    const blocked = await contactsService.listBlocked(req.user!.sub);
    res.json(blocked);
  },

  async listSuggestions(req: Request, res: Response) {
    const suggestions = await contactsService.listSuggestions(req.user!.sub);
    res.json(suggestions);
  },

  async dismissSuggestion(req: Request, res: Response) {
    await contactsService.dismissSuggestion(req.user!.sub, req.params.userId);
    res.status(204).send();
  },

  async listUpcomingBirthdays(req: Request, res: Response) {
    const birthdays = await contactsService.listUpcomingBirthdays(req.user!.sub);
    res.json(birthdays);
  },

  async listMutual(req: Request, res: Response) {
    const users = await contactsService.listMutualContacts(req.user!.sub, req.params.userId);
    res.json(users);
  },
};
