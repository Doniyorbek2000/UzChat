import { ContactStatus, LastSeenPrivacy } from "@prisma/client";
import { prisma } from "../config/prisma";

/** Returns the IDs of users who are mutual (accepted) contacts of `viewerId`. */
export async function getContactIds(viewerId: string): Promise<Set<string>> {
  const contacts = await prisma.contact.findMany({
    where: { ownerId: viewerId, status: ContactStatus.ACCEPTED },
    select: { targetId: true },
  });
  return new Set(contacts.map((c) => c.targetId));
}

/** Strips `lastSeenAt` from `user` if `viewerId` is not allowed to see it per `user.lastSeenPrivacy`. */
export function filterLastSeen<T extends { id: string; lastSeenAt: Date | null; lastSeenPrivacy: LastSeenPrivacy }>(
  viewerId: string,
  user: T,
  contactIds: Set<string>
): Omit<T, "lastSeenPrivacy"> {
  const { lastSeenPrivacy, ...rest } = user;
  let visible = true;
  if (user.id !== viewerId) {
    if (lastSeenPrivacy === LastSeenPrivacy.NOBODY) visible = false;
    else if (lastSeenPrivacy === LastSeenPrivacy.CONTACTS) visible = contactIds.has(user.id);
  }
  return { ...rest, lastSeenAt: visible ? user.lastSeenAt : null };
}

/** Convenience for filtering a single user without pre-fetching the contact set. */
export async function filterLastSeenSingle<
  T extends { id: string; lastSeenAt: Date | null; lastSeenPrivacy: LastSeenPrivacy },
>(viewerId: string, user: T): Promise<Omit<T, "lastSeenPrivacy">> {
  if (user.id === viewerId || user.lastSeenPrivacy === LastSeenPrivacy.EVERYONE) {
    const { lastSeenPrivacy, ...rest } = user;
    return rest;
  }
  if (user.lastSeenPrivacy === LastSeenPrivacy.NOBODY) {
    const { lastSeenPrivacy, ...rest } = user;
    return { ...rest, lastSeenAt: null };
  }
  const contact = await prisma.contact.findUnique({
    where: { ownerId_targetId: { ownerId: viewerId, targetId: user.id } },
  });
  const { lastSeenPrivacy, ...rest } = user;
  return { ...rest, lastSeenAt: contact?.status === ContactStatus.ACCEPTED ? user.lastSeenAt : null };
}

/** Strips `avatarUrl` from `user` if `viewerId` is not allowed to see it per `user.avatarPrivacy`. */
export function filterAvatar<T extends { id: string; avatarUrl: string | null; avatarPrivacy: LastSeenPrivacy }>(
  viewerId: string,
  user: T,
  contactIds: Set<string>
): Omit<T, "avatarPrivacy"> {
  const { avatarPrivacy, ...rest } = user;
  let visible = true;
  if (user.id !== viewerId) {
    if (avatarPrivacy === LastSeenPrivacy.NOBODY) visible = false;
    else if (avatarPrivacy === LastSeenPrivacy.CONTACTS) visible = contactIds.has(user.id);
  }
  return { ...rest, avatarUrl: visible ? user.avatarUrl : null };
}

/** Convenience for filtering a single user's avatar without pre-fetching the contact set. */
export async function filterAvatarSingle<
  T extends { id: string; avatarUrl: string | null; avatarPrivacy: LastSeenPrivacy },
>(viewerId: string, user: T): Promise<Omit<T, "avatarPrivacy">> {
  if (user.id === viewerId || user.avatarPrivacy === LastSeenPrivacy.EVERYONE) {
    const { avatarPrivacy, ...rest } = user;
    return rest;
  }
  if (user.avatarPrivacy === LastSeenPrivacy.NOBODY) {
    const { avatarPrivacy, ...rest } = user;
    return { ...rest, avatarUrl: null };
  }
  const contact = await prisma.contact.findUnique({
    where: { ownerId_targetId: { ownerId: viewerId, targetId: user.id } },
  });
  const { avatarPrivacy, ...rest } = user;
  return { ...rest, avatarUrl: contact?.status === ContactStatus.ACCEPTED ? user.avatarUrl : null };
}
