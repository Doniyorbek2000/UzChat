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
