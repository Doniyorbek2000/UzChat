import { prisma } from "../../config/prisma";
import { UpdateLocationInput, NearbyQuery } from "./nearby.schema";

const userSummarySelect = {
  id: true,
  displayName: true,
  username: true,
  avatarUrl: true,
  bio: true,
  lastSeenAt: true,
} as const;

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const nearbyService = {
  async updateLocation(userId: string, input: UpdateLocationInput) {
    return prisma.nearbyLocation.upsert({
      where: { userId },
      update: {
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy ?? 0,
      },
      create: {
        userId,
        latitude: input.latitude,
        longitude: input.longitude,
        accuracy: input.accuracy ?? 0,
      },
    });
  },

  async setVisibility(userId: string, isVisible: boolean) {
    return prisma.nearbyLocation.upsert({
      where: { userId },
      update: { isVisible },
      create: { userId, latitude: 0, longitude: 0, isVisible },
    });
  },

  async findNearby(userId: string, query: NearbyQuery) {
    const degreeRange = query.radiusKm / 111.0;

    const locations = await prisma.nearbyLocation.findMany({
      where: {
        isVisible: true,
        userId: { not: userId },
        latitude: { gte: query.latitude - degreeRange, lte: query.latitude + degreeRange },
        longitude: { gte: query.longitude - degreeRange, lte: query.longitude + degreeRange },
      },
      include: { user: { select: userSummarySelect } },
      take: 100,
    });

    return locations
      .map((loc) => ({
        user: loc.user,
        distance: Math.round(haversineDistanceKm(query.latitude, query.longitude, loc.latitude, loc.longitude) * 100) / 100,
      }))
      .filter((r) => r.distance <= query.radiusKm)
      .sort((a, b) => a.distance - b.distance);
  },

  async hideLocation(userId: string) {
    await prisma.nearbyLocation.deleteMany({ where: { userId } });
  },
};
