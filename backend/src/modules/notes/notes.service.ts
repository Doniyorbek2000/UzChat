import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { CreateNoteInput, UpdateNoteInput } from "./notes.schema";

export const notesService = {
  async list(userId: string) {
    return prisma.note.findMany({
      where: { userId },
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    });
  },

  async get(userId: string, noteId: string) {
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.userId !== userId) throw Errors.notFound("Eslatma topilmadi");
    return note;
  },

  async create(userId: string, input: CreateNoteInput) {
    return prisma.note.create({
      data: { userId, ...input },
    });
  },

  async update(userId: string, noteId: string, input: UpdateNoteInput) {
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.userId !== userId) throw Errors.notFound("Eslatma topilmadi");
    return prisma.note.update({ where: { id: noteId }, data: input });
  },

  async delete(userId: string, noteId: string) {
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note || note.userId !== userId) throw Errors.notFound("Eslatma topilmadi");
    await prisma.note.delete({ where: { id: noteId } });
  },
};
