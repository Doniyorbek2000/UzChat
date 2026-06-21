import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  location: z.string().max(500).optional(),
  startAt: z.string(),
  endAt: z.string().optional(),
  isAllDay: z.boolean().optional(),
  color: z.string().optional(),
  reminderMinutes: z.number().int().min(0).max(10080).optional(),
});

export const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  location: z.string().max(500).optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  isAllDay: z.boolean().optional(),
  color: z.string().optional(),
  reminderMinutes: z.number().int().min(0).max(10080).nullable().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: "Kamida bitta maydon kerak" });

export const rsvpSchema = z.object({
  status: z.enum(["going", "maybe", "not_going"]),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type RsvpInput = z.infer<typeof rsvpSchema>;
