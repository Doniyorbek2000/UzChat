export const REMINDER_DURATION_OPTIONS: { label: string; value: number }[] = [
  { label: "20 daqiqadan keyin", value: 20 * 60 },
  { label: "1 soatdan keyin", value: 60 * 60 },
  { label: "3 soatdan keyin", value: 3 * 60 * 60 },
  { label: "Ertaga", value: 24 * 60 * 60 },
  { label: "1 haftadan keyin", value: 7 * 24 * 60 * 60 },
];

// Returns "1 soatdan keyin" style text for the time remaining until the reminder fires.
export function formatReminderTimeRemaining(remindAt: string): string {
  const remainingMs = new Date(remindAt).getTime() - Date.now();
  if (remainingMs <= 0) return "Tez orada";

  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days} kundan keyin`;

  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  if (hours >= 1) return `${hours} soatdan keyin`;

  const minutes = Math.max(1, Math.floor(remainingMs / (60 * 1000)));
  return `${minutes} daqiqadan keyin`;
}
