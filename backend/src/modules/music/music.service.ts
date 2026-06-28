import { prisma } from "../../config/prisma";
import { Errors } from "../../utils/errors";
import { UploadTrackInput, CreatePlaylistInput } from "./music.schema";

const userSelect = { id: true, displayName: true, username: true, avatarUrl: true };

export const musicService = {
  async getTrending(limit = 20) {
    return prisma.musicTrack.findMany({
      include: { uploader: { select: userSelect } },
      orderBy: { playCount: "desc" },
      take: limit,
    });
  },

  async search(query: string) {
    return prisma.musicTrack.findMany({
      where: { OR: [{ title: { contains: query, mode: "insensitive" } }, { artist: { contains: query, mode: "insensitive" } }] },
      include: { uploader: { select: userSelect } },
      take: 30,
    });
  },

  async upload(userId: string, input: UploadTrackInput) {
    return prisma.musicTrack.create({
      data: { ...input, uploaderId: userId },
      include: { uploader: { select: userSelect } },
    });
  },

  async play(trackId: string) {
    await prisma.musicTrack.update({ where: { id: trackId }, data: { playCount: { increment: 1 } } });
  },

  async toggleLike(userId: string, trackId: string) {
    const existing = await prisma.musicLike.findUnique({ where: { userId_trackId: { userId, trackId } } });
    if (existing) {
      await prisma.musicLike.delete({ where: { id: existing.id } });
      await prisma.musicTrack.update({ where: { id: trackId }, data: { likeCount: { decrement: 1 } } });
      return { liked: false };
    }
    await prisma.musicLike.create({ data: { userId, trackId } });
    await prisma.musicTrack.update({ where: { id: trackId }, data: { likeCount: { increment: 1 } } });
    return { liked: true };
  },

  async createPlaylist(userId: string, input: CreatePlaylistInput) {
    return prisma.playlist.create({ data: { userId, ...input } });
  },

  async getMyPlaylists(userId: string) {
    return prisma.playlist.findMany({
      where: { userId },
      include: { _count: { select: { tracks: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  },

  async addToPlaylist(userId: string, playlistId: string, trackId: string) {
    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist || playlist.userId !== userId) throw Errors.forbidden("Ruxsat yo'q");
    const count = await prisma.playlistTrack.count({ where: { playlistId } });
    return prisma.playlistTrack.create({ data: { playlistId, trackId, position: count } });
  },

  async removeFromPlaylist(userId: string, playlistId: string, trackId: string) {
    const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } });
    if (!playlist || playlist.userId !== userId) throw Errors.forbidden("Ruxsat yo'q");
    await prisma.playlistTrack.deleteMany({ where: { playlistId, trackId } });
  },

  async getPlaylistTracks(playlistId: string) {
    return prisma.playlistTrack.findMany({
      where: { playlistId },
      include: { track: { include: { uploader: { select: userSelect } } } },
      orderBy: { position: "asc" },
      take: 500,
    });
  },

  async deleteTrack(userId: string, trackId: string) {
    const track = await prisma.musicTrack.findUnique({ where: { id: trackId } });
    if (!track || track.uploaderId !== userId) throw Errors.forbidden("Ruxsat yo'q");
    await prisma.musicTrack.delete({ where: { id: trackId } });
  },
};
