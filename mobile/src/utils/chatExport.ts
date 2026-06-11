import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { chatsApi } from "../api/chats";
import { decryptToMessage } from "../store/chatStore";
import { Conversation, Message, MessageType } from "../types";

const PAGE_SIZE = 100;

const MEDIA_LABELS: Partial<Record<MessageType, string>> = {
  IMAGE: "🖼 Rasm",
  VIDEO: "🎬 Video",
  AUDIO: "🎵 Ovozli xabar",
  FILE: "📄 Fayl",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function messageToLine(message: Message, conversationKey: string, senderName: string): string {
  const prefix = `[${formatTimestamp(message.createdAt)}] ${senderName}`;

  if (message.deletedAt) return `${prefix}: 🚫 Xabar o'chirilgan`;

  const decrypted = decryptToMessage(conversationKey, message);
  if (decrypted.decryptFailed) return `${prefix}: 🔒 Xabarni ochib bo'lmadi`;

  let body: string;
  switch (message.type) {
    case "POLL":
      body = decrypted.pollMeta ? `📊 So'rovnoma: ${decrypted.pollMeta.question}` : "📊 So'rovnoma";
      break;
    case "CONTACT":
      body = decrypted.contactMeta ? `👤 Kontakt: ${decrypted.contactMeta.displayName}` : "👤 Kontakt";
      break;
    case "IMAGE":
    case "VIDEO":
    case "AUDIO":
    case "FILE": {
      const label = MEDIA_LABELS[message.type] ?? "📎 Fayl";
      body = decrypted.text ? `${label}: ${decrypted.text}` : label;
      break;
    }
    default:
      body = decrypted.text ?? "";
  }

  if (message.editedAt) body = `${body} (tahrirlangan)`;
  if (message.forwardedFromName) body = `↪️ ${message.forwardedFromName}dan: ${body}`;

  return `${prefix}: ${body}`;
}

export interface ExportConversationOptions {
  conversation: Conversation;
  conversationKey: string;
  conversationTitle: string;
  currentUserId: string;
  contactAliases?: Record<string, string>;
}

/** Paginates through a conversation's full message history, decrypts it locally and shares it as a text file. */
export async function exportConversation({
  conversation,
  conversationKey,
  conversationTitle,
  currentUserId,
  contactAliases = {},
}: ExportConversationOptions): Promise<void> {
  const senderNames = new Map<string, string>();
  for (const p of conversation.participants) {
    senderNames.set(p.userId, p.userId === currentUserId ? "Siz" : (contactAliases[p.userId] ?? p.user.displayName));
  }

  const pages: Message[][] = [];
  let before: string | undefined;
  for (;;) {
    const page = await chatsApi.listMessages(conversation.id, before, PAGE_SIZE);
    if (page.length === 0) break;
    pages.push(page);
    before = page[0].createdAt;
    if (page.length < PAGE_SIZE) break;
  }

  const messages = pages.reverse().flat();
  const lines = messages.map((m) => messageToLine(m, conversationKey, senderNames.get(m.senderId) ?? "Noma'lum foydalanuvchi"));

  const header = `${conversationTitle}\nSuhbat tarixi · Eksport qilindi: ${formatTimestamp(new Date().toISOString())}\n${"-".repeat(40)}\n\n`;
  const content = messages.length > 0 ? header + lines.join("\n") + "\n" : `${header}Xabarlar yo'q\n`;

  const fileUri = `${FileSystem.cacheDirectory}uzchat-export-${conversation.id}-${Date.now()}.txt`;
  await FileSystem.writeAsStringAsync(fileUri, content);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: "text/plain", dialogTitle: `${conversationTitle} - eksport` });
  }
}
