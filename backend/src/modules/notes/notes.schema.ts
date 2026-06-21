import { z } from "zod";

export const createNoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  color: z.string().optional(),
  isPinned: z.boolean().optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
  color: z.string().optional(),
  isPinned: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Kamida bitta maydon kerak" });

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
