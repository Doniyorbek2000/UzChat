export const MAX_DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const UZ_MONTHS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];

/** Formats a birthday as "15-iyun". Returns null if either value is missing. */
export function formatBirthday(day?: number | null, month?: number | null): string | null {
  if (!day || !month || month < 1 || month > 12) return null;
  return `${day}-${UZ_MONTHS[month - 1].toLowerCase()}`;
}

/** True if the given day/month matches today's date. */
export function isBirthdayToday(day?: number | null, month?: number | null): boolean {
  if (!day || !month) return false;
  const now = new Date();
  return now.getDate() === day && now.getMonth() + 1 === month;
}
