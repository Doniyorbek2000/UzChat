import { Conversation, User } from "../types";

export function getConversationDisplay(conversation: Conversation, currentUserId: string) {
  if (conversation.type === "GROUP") {
    return { title: conversation.title ?? "Guruh", avatarUrl: conversation.avatarUrl, otherUser: null as User | null };
  }

  const other = conversation.participants.find((p) => p.userId !== currentUserId)?.user ?? null;
  return {
    title: other?.displayName ?? "Foydalanuvchi",
    avatarUrl: other?.avatarUrl ?? null,
    otherUser: other,
  };
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
