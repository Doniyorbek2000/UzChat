import { z } from "zod";

export const uploadTrackSchema = z.object({
  title: z.string().min(1).max(200),
  artist: z.string().min(1).max(200),
  albumTitle: z.string().max(200).optional(),
  coverUrl: z.string().url().optional(),
  audioUrl: z.string().url(),
  duration: z.number().int().min(1),
  genre: z.string().max(50).optional(),
});

export const createPlaylistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  coverUrl: z.string().url().optional(),
  isPublic: z.boolean().optional(),
});

export type UploadTrackInput = z.infer<typeof uploadTrackSchema>;
export type CreatePlaylistInput = z.infer<typeof createPlaylistSchema>;
