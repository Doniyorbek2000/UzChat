export const SLOW_MODE_OPTIONS: { label: string; value: number }[] = [
  { label: "O'chiq", value: 0 },
  { label: "10 soniya", value: 10 },
  { label: "30 soniya", value: 30 },
  { label: "1 daqiqa", value: 60 },
  { label: "5 daqiqa", value: 5 * 60 },
  { label: "15 daqiqa", value: 15 * 60 },
  { label: "1 soat", value: 60 * 60 },
];

export function formatSlowModeDuration(seconds: number): string {
  const option = SLOW_MODE_OPTIONS.find((o) => o.value === seconds);
  if (option) return option.label;
  if (!seconds) return "O'chiq";
  return `${seconds} soniya`;
}
