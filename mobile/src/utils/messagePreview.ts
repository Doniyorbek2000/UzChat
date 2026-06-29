import { MessageType } from "../types";
import { stripFormatting } from "./textFormat";

export const REPLY_TYPE_LABELS: Partial<Record<MessageType, string>> = {
  IMAGE: "🖼 Rasm",
  VIDEO: "🎬 Video",
  AUDIO: "🎵 Ovozli xabar",
  FILE: "📄 Fayl",
  CONTACT: "👤 Kontakt",
  POLL: "📊 So'rovnoma",
  LOCATION: "📍 Joylashuv",
  STICKER: "🏷 Stiker",
};

export function getPreviewLabel(item: { type: MessageType; text: string | null; deletedAt: string | null }) {
  if (item.deletedAt) return "🚫 Xabar o'chirildi";
  if (item.type === "TEXT") return item.text != null ? stripFormatting(item.text) : "🔒 Xabarni ochib bo'lmadi";
  const label = REPLY_TYPE_LABELS[item.type] ?? "Xabar";
  return item.text ? `${label}: ${stripFormatting(item.text)}` : label;
}
