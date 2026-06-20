import { Conversation, User } from "../types";
import { stripFormatting } from "./textFormat";

export function getConversationDisplay(
  conversation: Conversation,
  currentUserId: string,
  contactAliases: Record<string, string> = {}
) {
  if (conversation.isSelf) {
    return { title: "Shaxsiy yozuvlar", avatarUrl: null as string | null, otherUser: null as User | null };
  }

  if (conversation.type === "GROUP" || conversation.type === "CHANNEL") {
    return { title: conversation.title ?? (conversation.type === "CHANNEL" ? "Kanal" : "Guruh"), avatarUrl: conversation.avatarUrl, otherUser: null as User | null };
  }

  const other = conversation.participants.find((p) => p.userId !== currentUserId)?.user ?? null;
  return {
    title: (other && contactAliases[other.id]) || other?.displayName || "Foydalanuvchi",
    avatarUrl: other?.avatarUrl ?? null,
    otherUser: other,
  };
}

const MEDIA_PREVIEW_LABELS: Record<string, string> = {
  IMAGE: "🖼 Rasm",
  VIDEO: "🎬 Video",
  AUDIO: "🎵 Ovozli xabar",
  FILE: "📄 Fayl",
  CONTACT: "👤 Kontakt",
  POLL: "📊 So'rovnoma",
};

/** Short preview text for a decrypted message, suitable for chat list previews and notification toasts. */
export function messagePreviewText(message: {
  type: string;
  text: string | null;
  decryptFailed: boolean;
  deletedAt?: string | null;
}): string {
  if (message.deletedAt) return "Xabar o'chirildi";
  if (message.decryptFailed) return "Xabarni ochib bo'lmadi";
  const mediaLabel = MEDIA_PREVIEW_LABELS[message.type];
  if (mediaLabel) return message.text ? `${mediaLabel}: ${stripFormatting(message.text)}` : mediaLabel;
  return message.text ? stripFormatting(message.text) : "";
}

// `excludeMuted` is used for unread badge counters (app icon, folder chips)
// when the user disabled "include muted chats in badge count" - the chat
// itself is still shown as unread in the list either way.
export function isConversationUnread(conversation: Conversation, currentUserId: string, excludeMuted = false): boolean {
  if (excludeMuted && conversation.isMuted) return false;
  if (conversation.markedUnread) return true;

  const lastMessage = conversation.lastMessage;
  if (!lastMessage || lastMessage.senderId === currentUserId) return false;

  if (!conversation.lastReadAt) return true;
  return new Date(lastMessage.createdAt) > new Date(conversation.lastReadAt);
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const day = date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${day}, ${time}`;
}

const WEEKDAY_NAMES = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
const MONTH_NAMES = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

/** Label for a date separator shown between messages sent on different days. */
export function formatDateSeparator(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) return "Bugun";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Kecha";

  const daysAgo = Math.round((now.setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / (24 * 60 * 60 * 1000));
  if (daysAgo > 0 && daysAgo < 7) return WEEKDAY_NAMES[date.getDay()];

  const day = `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
  return date.getFullYear() === now.getFullYear() ? day : `${day} ${date.getFullYear()}`;
}

/** Label for a group member's join date, e.g. "12-may, 2025-yil". */
export function formatJoinDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getDate()}-${MONTH_NAMES[date.getMonth()]}, ${date.getFullYear()}-yil`;
}
