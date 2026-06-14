export const CUSTOM_STATUS_DURATION_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Tozalamaslik", value: null },
  { label: "30 daqiqa", value: 30 * 60 },
  { label: "1 soat", value: 60 * 60 },
  { label: "4 soat", value: 4 * 60 * 60 },
  { label: "24 soat", value: 24 * 60 * 60 },
];

export function formatCustomStatusDuration(seconds: number | null): string {
  const option = CUSTOM_STATUS_DURATION_OPTIONS.find((o) => o.value === seconds);
  return option ? option.label : "Tozalamaslik";
}

// Returns "1 soatdan keyin tozalanadi" style text, or null once the expiry
// has passed (the status will be cleared shortly via the server job).
export function formatCustomStatusExpiry(expiresAt: string): string | null {
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return null;

  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  if (hours >= 1) return `${hours} soatdan keyin tozalanadi`;

  const minutes = Math.max(1, Math.floor(remainingMs / (60 * 1000)));
  return `${minutes} daqiqadan keyin tozalanadi`;
}
