import { z } from "zod";

export const createThemeSchema = z.object({
  name: z.string().trim().min(1).max(50),
  description: z.string().trim().max(200).optional(),
  primaryColor: z.string(),
  backgroundColor: z.string(),
  surfaceColor: z.string(),
  textColor: z.string(),
  accentColor: z.string().optional(),
  isDark: z.boolean().optional(),
  wallpaperUrl: z.string().url().optional(),
});

export const updateThemeSchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    description: z.string().trim().max(200).optional(),
    primaryColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    surfaceColor: z.string().optional(),
    textColor: z.string().optional(),
    accentColor: z.string().optional(),
    isDark: z.boolean().optional(),
    wallpaperUrl: z.string().url().optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: "Hech narsa o'zgartirilmadi" }
  );

export type CreateThemeInput = z.infer<typeof createThemeSchema>;
export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;
