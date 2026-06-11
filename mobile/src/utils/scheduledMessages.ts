export interface ScheduleOption {
  label: string;
  getDate: () => Date;
}

function atTomorrow(hours: number, minutes: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export const SCHEDULE_OPTIONS: ScheduleOption[] = [
  { label: "15 daqiqadan keyin", getDate: () => new Date(Date.now() + 15 * 60 * 1000) },
  { label: "1 soatdan keyin", getDate: () => new Date(Date.now() + 60 * 60 * 1000) },
  { label: "3 soatdan keyin", getDate: () => new Date(Date.now() + 3 * 60 * 60 * 1000) },
  { label: "Ertaga ertalab (9:00)", getDate: () => atTomorrow(9, 0) },
  { label: "Ertaga kechqurun (18:00)", getDate: () => atTomorrow(18, 0) },
];

export function formatScheduledTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (date.toDateString() === now.toDateString()) return `Bugun, ${time}`;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return `Ertaga, ${time}`;

  return `${date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" })}, ${time}`;
}
