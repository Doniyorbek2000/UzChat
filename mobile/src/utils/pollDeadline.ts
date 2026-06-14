export const POLL_DEADLINE_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Yo'q", value: null },
  { label: "1 soat", value: 60 * 60 },
  { label: "1 kun", value: 24 * 60 * 60 },
  { label: "1 hafta", value: 7 * 24 * 60 * 60 },
];

export function formatPollDeadline(seconds: number | null): string {
  const option = POLL_DEADLINE_OPTIONS.find((o) => o.value === seconds);
  return option ? option.label : "Yo'q";
}

// Returns "Yopilishiga 2 soat qoldi" style countdown text, or null once the
// deadline has passed (the poll will close shortly via the server job).
export function formatPollTimeRemaining(closesAt: string): string | null {
  const remainingMs = new Date(closesAt).getTime() - Date.now();
  if (remainingMs <= 0) return null;

  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  if (days >= 1) return `Yopilishiga ${days} kun qoldi`;

  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  if (hours >= 1) return `Yopilishiga ${hours} soat qoldi`;

  const minutes = Math.max(1, Math.floor(remainingMs / (60 * 1000)));
  return `Yopilishiga ${minutes} daqiqa qoldi`;
}
