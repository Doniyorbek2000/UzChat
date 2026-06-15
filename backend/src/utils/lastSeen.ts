import { ContactStatus, LastSeenExceptionMode, LastSeenPrivacy } from "@prisma/client";
import { prisma } from "../config/prisma";

/** Returns the IDs of users who are mutual (accepted) contacts of `viewerId`. */
export async function getContactIds(viewerId: string): Promise<Set<string>> {
  const contacts = await prisma.contact.findMany({
    where: { ownerId: viewerId, status: ContactStatus.ACCEPTED },
    select: { targetId: true },
  });
  return new Set(contacts.map((c) => c.targetId));
}

/**
 * Returns a map of userId -> exception mode for users who have set a
 * lastSeenAt exception (ALLOW/DENY) specifically for `viewerId`, keyed by
 * the *owner* of the exception (i.e. the user whose last-seen is affected).
 */
export async function getLastSeenExceptions(viewerId: string): Promise<Map<string, LastSeenExceptionMode>> {
  const exceptions = await prisma.lastSeenException.findMany({
    where: { exceptionUserId: viewerId },
    select: { ownerId: true, mode: true },
  });
  return new Map(exceptions.map((e) => [e.ownerId, e.mode]));
}

/** Strips `lastSeenAt` from `user` if `viewerId` is not allowed to see it per `user.lastSeenPrivacy`. */
export function filterLastSeen<T extends { id: string; lastSeenAt: Date | null; lastSeenPrivacy: LastSeenPrivacy }>(
  viewerId: string,
  user: T,
  contactIds: Set<string>,
  exceptions?: Map<string, LastSeenExceptionMode>
): Omit<T, "lastSeenPrivacy"> {
  const { lastSeenPrivacy, ...rest } = user;
  let visible = true;
  if (user.id !== viewerId) {
    const exception = exceptions?.get(user.id);
    if (exception) {
      visible = exception === LastSeenExceptionMode.ALLOW;
    } else if (lastSeenPrivacy === LastSeenPrivacy.NOBODY) visible = false;
    else if (lastSeenPrivacy === LastSeenPrivacy.CONTACTS) visible = contactIds.has(user.id);
  }
  return { ...rest, lastSeenAt: visible ? user.lastSeenAt : null };
}

/** Convenience for filtering a single user without pre-fetching the contact set. */
export async function filterLastSeenSingle<
  T extends { id: string; lastSeenAt: Date | null; lastSeenPrivacy: LastSeenPrivacy },
>(viewerId: string, user: T): Promise<Omit<T, "lastSeenPrivacy">> {
  if (user.id === viewerId) {
    const { lastSeenPrivacy, ...rest } = user;
    return rest;
  }
  const exception = await prisma.lastSeenException.findUnique({
    where: { ownerId_exceptionUserId: { ownerId: user.id, exceptionUserId: viewerId } },
  });
  if (exception) {
    const { lastSeenPrivacy, ...rest } = user;
    return { ...rest, lastSeenAt: exception.mode === LastSeenExceptionMode.ALLOW ? user.lastSeenAt : null };
  }
  if (user.lastSeenPrivacy === LastSeenPrivacy.EVERYONE) {
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

/** Strips `bio` from `user` if `viewerId` is not allowed to see it per `user.bioPrivacy`. */
export function filterBio<T extends { id: string; bio: string | null; bioPrivacy: LastSeenPrivacy }>(
  viewerId: string,
  user: T,
  contactIds: Set<string>
): Omit<T, "bioPrivacy"> {
  const { bioPrivacy, ...rest } = user;
  let visible = true;
  if (user.id !== viewerId) {
    if (bioPrivacy === LastSeenPrivacy.NOBODY) visible = false;
    else if (bioPrivacy === LastSeenPrivacy.CONTACTS) visible = contactIds.has(user.id);
  }
  return { ...rest, bio: visible ? user.bio : null };
}

/** Convenience for filtering a single user's bio without pre-fetching the contact set. */
export async function filterBioSingle<T extends { id: string; bio: string | null; bioPrivacy: LastSeenPrivacy }>(
  viewerId: string,
  user: T
): Promise<Omit<T, "bioPrivacy">> {
  if (user.id === viewerId || user.bioPrivacy === LastSeenPrivacy.EVERYONE) {
    const { bioPrivacy, ...rest } = user;
    return rest;
  }
  if (user.bioPrivacy === LastSeenPrivacy.NOBODY) {
    const { bioPrivacy, ...rest } = user;
    return { ...rest, bio: null };
  }
  const contact = await prisma.contact.findUnique({
    where: { ownerId_targetId: { ownerId: viewerId, targetId: user.id } },
  });
  const { bioPrivacy, ...rest } = user;
  return { ...rest, bio: contact?.status === ContactStatus.ACCEPTED ? user.bio : null };
}

/** Strips `birthdayDay`/`birthdayMonth` from `user` if `viewerId` is not allowed to see them per `user.birthdayPrivacy`. */
export function filterBirthday<
  T extends { id: string; birthdayDay: number | null; birthdayMonth: number | null; birthdayPrivacy: LastSeenPrivacy },
>(viewerId: string, user: T, contactIds: Set<string>): Omit<T, "birthdayPrivacy"> {
  const { birthdayPrivacy, ...rest } = user;
  let visible = true;
  if (user.id !== viewerId) {
    if (birthdayPrivacy === LastSeenPrivacy.NOBODY) visible = false;
    else if (birthdayPrivacy === LastSeenPrivacy.CONTACTS) visible = contactIds.has(user.id);
  }
  return { ...rest, birthdayDay: visible ? user.birthdayDay : null, birthdayMonth: visible ? user.birthdayMonth : null };
}

/** Convenience for filtering a single user's birthday without pre-fetching the contact set. */
export async function filterBirthdaySingle<
  T extends { id: string; birthdayDay: number | null; birthdayMonth: number | null; birthdayPrivacy: LastSeenPrivacy },
>(viewerId: string, user: T): Promise<Omit<T, "birthdayPrivacy">> {
  if (user.id === viewerId || user.birthdayPrivacy === LastSeenPrivacy.EVERYONE) {
    const { birthdayPrivacy, ...rest } = user;
    return rest;
  }
  if (user.birthdayPrivacy === LastSeenPrivacy.NOBODY) {
    const { birthdayPrivacy, ...rest } = user;
    return { ...rest, birthdayDay: null, birthdayMonth: null };
  }
  const contact = await prisma.contact.findUnique({
    where: { ownerId_targetId: { ownerId: viewerId, targetId: user.id } },
  });
  const { birthdayPrivacy, ...rest } = user;
  const visible = contact?.status === ContactStatus.ACCEPTED;
  return { ...rest, birthdayDay: visible ? user.birthdayDay : null, birthdayMonth: visible ? user.birthdayMonth : null };
}

/**
 * Returns whether `forwarderId` may reveal `originalSenderId`'s name/profile as the
 * "Forwarded from" attribution, per `originalSenderId`'s forwardedMessagePrivacy setting.
 */
export async function canRevealForwardedFrom(forwarderId: string, originalSenderId: string): Promise<boolean> {
  if (forwarderId === originalSenderId) return true;
  const original = await prisma.user.findUnique({
    where: { id: originalSenderId },
    select: { forwardedMessagePrivacy: true },
  });
  if (!original || original.forwardedMessagePrivacy === LastSeenPrivacy.EVERYONE) return true;
  if (original.forwardedMessagePrivacy === LastSeenPrivacy.NOBODY) return false;
  const contact = await prisma.contact.findUnique({
    where: { ownerId_targetId: { ownerId: forwarderId, targetId: originalSenderId } },
  });
  return contact?.status === ContactStatus.ACCEPTED;
}
