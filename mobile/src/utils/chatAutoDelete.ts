export const AUTO_DELETE_OPTIONS: { label: string; value: number | null }[] = [
  { label: "O'chiq", value: null },
  { label: "30 kun", value: 30 * 24 * 60 * 60 },
  { label: "90 kun", value: 90 * 24 * 60 * 60 },
  { label: "180 kun", value: 180 * 24 * 60 * 60 },
];

export function formatAutoDeleteDuration(seconds: number | null): string {
  const option = AUTO_DELETE_OPTIONS.find((o) => o.value === seconds);
  if (option) return option.label;
  if (!seconds) return "O'chiq";
  return `${Math.round(seconds / (24 * 60 * 60))} kun`;
}
