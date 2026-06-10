import { z } from "zod";

export const addContactSchema = z.object({
  username: z.string().min(1).max(24),
});

export type AddContactInput = z.infer<typeof addContactSchema>;
