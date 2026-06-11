import { z } from "zod";

export const addContactSchema = z.object({
  username: z.string().min(1).max(24),
});

export const updateContactSchema = z.object({
  alias: z
    .string()
    .trim()
    .max(64, "Taxallus juda uzun")
    .nullable()
    .transform((v) => (v ? v : null)),
});

export type AddContactInput = z.infer<typeof addContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
