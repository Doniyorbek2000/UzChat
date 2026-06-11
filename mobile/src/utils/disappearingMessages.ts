export const DISAPPEARING_MESSAGE_OPTIONS: { label: string; value: number | null }[] = [
  { label: "O'chiq", value: null },
  { label: "24 soat", value: 24 * 60 * 60 },
  { label: "7 kun", value: 7 * 24 * 60 * 60 },
  { label: "90 kun", value: 90 * 24 * 60 * 60 },
];

export function formatDisappearingDuration(seconds: number | null): string {
  const option = DISAPPEARING_MESSAGE_OPTIONS.find((o) => o.value === seconds);
  if (option) return option.label;
  if (!seconds) return "O'chiq";
  return `${Math.round(seconds / (24 * 60 * 60))} kun`;
}
