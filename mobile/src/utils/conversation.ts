import { Conversation, User } from "../types";

export function getConversationDisplay(
  conversation: Conversation,
  currentUserId: string,
  contactAliases: Record<string, string> = {}
) {
  if (conversation.isSelf) {
    return { title: "Shaxsiy yozuvlar", avatarUrl: null as string | null, otherUser: null as User | null };
  }

  if (conversation.type === "GROUP") {
    return { title: conversation.title ?? "Guruh", avatarUrl: conversation.avatarUrl, otherUser: null as User | null };
  }

  const other = conversation.participants.find((p) => p.userId !== currentUserId)?.user ?? null;
  return {
    title: (other && contactAliases[other.id]) || other?.displayName || "Foydalanuvchi",
    avatarUrl: other?.avatarUrl ?? null,
    otherUser: other,
  };
}

export function isConversationUnread(conversation: Conversation, currentUserId: string): boolean {
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
