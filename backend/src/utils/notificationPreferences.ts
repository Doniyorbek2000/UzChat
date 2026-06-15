// Whether `user` currently has "do not disturb" active, based on their
// configured local-time window and captured UTC offset.
export function isInQuietHours(user: {
  quietHoursEnabled: boolean;
  quietHoursStart: number | null;
  quietHoursEnd: number | null;
  quietHoursTimezoneOffset: number | null;
}): boolean {
  if (!user.quietHoursEnabled || user.quietHoursStart == null || user.quietHoursEnd == null) return false;
  const offset = user.quietHoursTimezoneOffset ?? 0;
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const localMinutes = (((utcMinutes + offset) % 1440) + 1440) % 1440;
  const { quietHoursStart: start, quietHoursEnd: end } = user;
  if (start === end) return true;
  if (start < end) return localMinutes >= start && localMinutes < end;
  return localMinutes >= start || localMinutes < end;
}

// Whether `user` has globally paused notifications ("do not disturb"),
// either indefinitely (notificationsPaused) or until a future time
// (notificationsPausedUntil) - mirrors isParticipantMuted for conversations.
export function isNotificationsPaused(user: {
  notificationsPaused: boolean;
  notificationsPausedUntil: Date | null;
}): boolean {
  return user.notificationsPaused || (user.notificationsPausedUntil !== null && user.notificationsPausedUntil.getTime() > Date.now());
}
