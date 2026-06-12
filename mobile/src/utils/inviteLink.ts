export const INVITE_EXPIRY_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Doimiy", value: null },
  { label: "1 soat", value: 60 * 60 },
  { label: "1 kun", value: 24 * 60 * 60 },
  { label: "7 kun", value: 7 * 24 * 60 * 60 },
];

export const INVITE_MAX_USES_OPTIONS: { label: string; value: number | null }[] = [
  { label: "Cheksiz", value: null },
  { label: "1 kishi", value: 1 },
  { label: "10 kishi", value: 10 },
  { label: "100 kishi", value: 100 },
];

export function formatInviteStatus(
  expiresAt: string | null,
  maxUses: number | null,
  useCount: number | null
): string {
  const parts: string[] = [];

  if (expiresAt) {
    const expiresAtMs = new Date(expiresAt).getTime();
    if (expiresAtMs <= Date.now()) {
      parts.push("Muddati tugagan");
    } else {
      const remainingMs = expiresAtMs - Date.now();
      const days = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
      const hours = Math.floor(remainingMs / (60 * 60 * 1000));
      if (days >= 1) parts.push(`${days} kundan keyin tugaydi`);
      else if (hours >= 1) parts.push(`${hours} soatdan keyin tugaydi`);
      else parts.push("Tez orada tugaydi");
    }
  } else {
    parts.push("Doimiy");
  }

  if (maxUses !== null) {
    parts.push(`${useCount ?? 0}/${maxUses} marta ishlatilgan`);
  } else if (useCount) {
    parts.push(`${useCount} marta ishlatilgan`);
  }

  return parts.join(" • ");
}
