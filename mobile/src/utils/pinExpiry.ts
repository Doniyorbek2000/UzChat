export const PIN_DURATION_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Doimiy", value: null },
  { label: "1 soat", value: 60 * 60 },
  { label: "1 kun", value: 24 * 60 * 60 },
  { label: "1 hafta", value: 7 * 24 * 60 * 60 },
];

// Returns "1 kundan keyin yechiladi" style text, or null if the pin has no
// expiry or it has already passed (it will be unpinned shortly via the server job).
export function formatPinTimeRemaining(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const remainingMs = new Date(expiresAt).getTime() - Date.now();
  if (remainingMs <= 0) return null;

  const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days} kundan keyin yechiladi`;

  const hours = Math.floor(remainingMs / (60 * 60 * 1000));
  if (hours >= 1) return `${hours} soatdan keyin yechiladi`;

  const minutes = Math.max(1, Math.floor(remainingMs / (60 * 1000)));
  return `${minutes} daqiqadan keyin yechiladi`;
}
