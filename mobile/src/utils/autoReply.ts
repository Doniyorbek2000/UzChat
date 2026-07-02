import * as FileSystem from "expo-file-system/legacy";
import { autoReplyApi, AutoReplySettings } from "../api/autoReply";
import { contactsApi } from "../api/contacts";
import { Conversation, Message } from "../types";

// Auto-reply has to run on the device: messages are E2EE, so the server
// can't compose an encrypted reply on the user's behalf.

const SENT_LOG_FILE = `${FileSystem.documentDirectory}autoReplySent.json`;
// One auto-reply per conversation per window — also breaks the ping-pong
// loop when both sides have auto-reply enabled.
const COOLDOWN_MS = 4 * 60 * 60 * 1000;
const SETTINGS_TTL_MS = 60 * 1000;
const CONTACTS_TTL_MS = 5 * 60 * 1000;

let cachedSettings: { value: AutoReplySettings | null; fetchedAt: number } | null = null;
let cachedContactIds: { ids: Set<string>; fetchedAt: number } | null = null;

export function invalidateAutoReplyCache() {
  cachedSettings = null;
}

async function getSettings(): Promise<AutoReplySettings | null> {
  if (cachedSettings && Date.now() - cachedSettings.fetchedAt < SETTINGS_TTL_MS) {
    return cachedSettings.value;
  }
  const value = await autoReplyApi.get();
  cachedSettings = { value, fetchedAt: Date.now() };
  return value;
}

async function isContact(userId: string): Promise<boolean> {
  if (!cachedContactIds || Date.now() - cachedContactIds.fetchedAt >= CONTACTS_TTL_MS) {
    const contacts = await contactsApi.list();
    cachedContactIds = { ids: new Set(contacts.map((c) => c.user.id)), fetchedAt: Date.now() };
  }
  return cachedContactIds.ids.has(userId);
}

async function getSentLog(): Promise<Record<string, number>> {
  const info = await FileSystem.getInfoAsync(SENT_LOG_FILE);
  if (!info.exists) return {};
  try {
    const data = JSON.parse(await FileSystem.readAsStringAsync(SENT_LOG_FILE));
    return typeof data === "object" && data !== null ? data : {};
  } catch {
    return {};
  }
}

async function setSentLog(log: Record<string, number>): Promise<void> {
  await FileSystem.writeAsStringAsync(SENT_LOG_FILE, JSON.stringify(log));
}

/**
 * Called for every incoming message; sends the user's configured auto-reply
 * when it applies. The reply sender is injected to avoid a circular import
 * with the chat store.
 */
export async function maybeAutoReply(
  conversation: Conversation,
  message: Message,
  currentUserId: string,
  sendReply: (conversationId: string, text: string) => Promise<void>
): Promise<void> {
  if (conversation.type !== "DIRECT" || conversation.isSelf) return;
  if (message.senderId === currentUserId || message.type === "SYSTEM") return;

  const settings = await getSettings();
  if (!settings?.isEnabled || !settings.message?.trim()) return;

  const now = Date.now();
  if (settings.startAt && now < Date.parse(settings.startAt)) return;
  if (settings.endAt && now > Date.parse(settings.endAt)) return;
  if (settings.onlyForStrangers && (await isContact(message.senderId))) return;

  const log = await getSentLog();
  if (now - (log[conversation.id] ?? 0) < COOLDOWN_MS) return;
  // Record before sending so overlapping events can't double-fire.
  log[conversation.id] = now;
  await setSentLog(log);

  await sendReply(conversation.id, settings.message.trim());
}
