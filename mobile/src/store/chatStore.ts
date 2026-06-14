import { create } from "zustand";
import { chatsApi } from "../api/chats";
import { contactsApi } from "../api/contacts";
import { chatFoldersApi } from "../api/chatFolders";
import { getSocket } from "../socket/socket";
import { useAuthStore } from "./authStore";
import {
  decodeInviteLink,
  decryptMessage,
  encodeInviteLink,
  encryptMessage,
  generateConversationKey,
  unwrapConversationKey,
  wrapConversationKey,
} from "../crypto/e2ee";
import { downloadAndDecryptFile, encryptAndUploadFile, extensionFromName } from "../utils/mediaFile";
import { draftStorage } from "../storage/draftStorage";
import { getConversationDisplay, isConversationUnread, messagePreviewText } from "../utils/conversation";
import { getActiveConversationId } from "../utils/pushNotifications";
import { useToastStore } from "./toastStore";
import {
  ChatFolder,
  Conversation,
  ContactCardMeta,
  Message,
  MediaAsset,
  MediaMeta,
  MessageReaction,
  MessageReminderInfo,
  MessageType,
  MuteDuration,
  ParticipantRole,
  PollMeta,
  PollVote,
  ReplyToSnapshot,
  RestrictDuration,
  User,
} from "../types";

export interface DecryptedMessage extends Message {
  text: string | null;
  meta: MediaMeta | null;
  // for CONTACT messages: the shared contact's profile info
  contactMeta: ContactCardMeta | null;
  // for POLL messages: the question and options
  pollMeta?: PollMeta | null;
  decryptFailed: boolean;
  replyPreview?: ReplyPreview | null;
}

export interface ReplyPreview {
  id: string;
  senderId: string;
  type: MessageType;
  text: string | null;
  deletedAt: string | null;
}

const MEDIA_TYPES: MessageType[] = ["IMAGE", "VIDEO", "AUDIO", "FILE"];
const PAGE_SIZE = 30;

// For anonymous polls, the realtime broadcast hides every voter's identity
// (including our own), while votePoll's own response keeps ours visible. Skip
// broadcasts that arrive shortly after our own vote so they don't clobber it.
const SELF_VOTE_GRACE_MS = 3000;
const recentSelfPollVotes = new Map<string, number>();

interface ChatState {
  conversations: Conversation[];
  messagesByConversation: Record<string, DecryptedMessage[]>;
  hasMoreByConversation: Record<string, boolean>;
  scheduledMessagesByConversation: Record<string, DecryptedMessage[]>;
  typingUsers: Record<string, Set<string>>;
  recordingUsers: Record<string, Set<string>>;
  onlineUsers: Set<string>;
  isConnected: boolean;
  listenersRegistered: boolean;
  drafts: Record<string, string>;
  contactAliases: Record<string, string>;
  favoriteContactIds: Set<string>;
  folders: ChatFolder[];
  reminders: MessageReminderInfo[];

  loadConversations: () => Promise<void>;
  loadContactAliases: () => Promise<void>;
  loadFolders: () => Promise<void>;
  createFolder: (name: string) => Promise<ChatFolder>;
  renameFolder: (folderId: string, name: string) => Promise<void>;
  setFolderIcon: (folderId: string, icon: string | null) => Promise<void>;
  reorderFolders: (folderIds: string[]) => Promise<void>;
  setFolderConversations: (folderId: string, conversationIds: string[]) => Promise<void>;
  setFolderFilters: (
    folderId: string,
    filters: { includeUnread: boolean; includeGroups: boolean; includeDirect: boolean; excludeMuted: boolean }
  ) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;
  loadDrafts: () => Promise<void>;
  setDraft: (conversationId: string, text: string) => Promise<void>;
  getConversationKey: (conversation: Conversation) => string;
  loadMessages: (conversationId: string) => Promise<void>;
  loadOlderMessages: (conversationId: string) => Promise<void>;
  searchAllMessages: (query: string) => Promise<{ conversationId: string; message: DecryptedMessage }[]>;
  sendTextMessage: (
    conversationId: string,
    text: string,
    replyToId?: string,
    mentions?: string[],
    scheduledFor?: string,
    silent?: boolean
  ) => Promise<void>;
  loadScheduledMessages: (conversationId: string) => Promise<void>;
  cancelScheduledMessage: (conversationId: string, messageId: string) => Promise<void>;
  rescheduleMessage: (conversationId: string, messageId: string, scheduledFor: string) => Promise<void>;
  sendScheduledMessageNow: (conversationId: string, messageId: string) => Promise<void>;
  sendMediaMessage: (
    conversationId: string,
    asset: MediaAsset,
    type: MessageType,
    replyToId?: string,
    viewOnce?: boolean,
    caption?: string,
    isSpoiler?: boolean
  ) => Promise<void>;
  viewOnceMedia: (conversationId: string, messageId: string) => Promise<void>;
  sendContactMessage: (conversationId: string, contact: User, replyToId?: string) => Promise<void>;
  sendPollMessage: (
    conversationId: string,
    question: string,
    options: string[],
    multipleChoice: boolean,
    anonymous: boolean,
    replyToId?: string,
    quizCorrectOptionIndex?: number,
    closesInSeconds?: number,
    quizExplanation?: string
  ) => Promise<void>;
  votePoll: (conversationId: string, messageId: string, optionIds: string[]) => Promise<void>;
  closePoll: (conversationId: string, messageId: string) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  hideMessageForMe: (conversationId: string, messageId: string) => Promise<void>;
  editMessage: (conversationId: string, messageId: string, text: string, mentions?: string[]) => Promise<void>;
  toggleReaction: (conversationId: string, messageId: string, emoji: string) => Promise<void>;
  toggleStar: (conversationId: string, messageId: string) => Promise<void>;
  forwardMessage: (
    sourceConversationId: string,
    messageId: string,
    targetConversationId: string,
    hideSender?: boolean
  ) => Promise<void>;
  createDirectConversation: (target: User) => Promise<Conversation>;
  getOrCreateSavedMessages: () => Promise<Conversation>;
  createGroupConversation: (title: string, members: User[]) => Promise<Conversation>;
  markRead: (conversationId: string, upToMessageId?: string, upToCreatedAt?: string) => Promise<void>;
  // When conversationIds is given, only those conversations are marked as read
  // (used for per-folder "mark all as read"); otherwise all unread conversations are.
  markAllRead: (conversationIds?: string[]) => Promise<void>;
  togglePin: (conversationId: string) => Promise<void>;
  reorderPinned: (conversationId: string, direction: "up" | "down") => Promise<void>;
  muteConversation: (conversationId: string, muteFor: MuteDuration) => Promise<void>;
  setNotificationPreview: (conversationId: string, notificationPreview: "DEFAULT" | "SHOW" | "HIDE") => Promise<void>;
  setReadReceiptsOverride: (conversationId: string, readReceiptsOverride: "DEFAULT" | "ON" | "OFF") => Promise<void>;
  setAutoDelete: (conversationId: string, autoDeleteAfterSeconds: number | null) => Promise<void>;
  toggleMutedSender: (conversationId: string, userId: string) => Promise<void>;
  toggleArchive: (conversationId: string) => Promise<void>;
  toggleUnread: (conversationId: string) => Promise<void>;
  clearHistory: (conversationId: string, olderThanDays?: number) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  deleteConversationForEveryone: (conversationId: string) => Promise<void>;
  pinMessage: (conversationId: string, messageId: string, expiresInSeconds?: number | null) => Promise<void>;
  unpinMessage: (conversationId: string, messageId: string) => Promise<void>;
  unpinAllMessages: (conversationId: string) => Promise<void>;
  fetchReminders: () => Promise<void>;
  setReminder: (conversationId: string, messageId: string, remindInSeconds: number) => Promise<void>;
  cancelReminder: (conversationId: string, messageId: string) => Promise<void>;
  setDisappearingMessages: (conversationId: string, disappearingSeconds: number | null) => Promise<void>;
  setNoForwards: (conversationId: string, noForwards: boolean) => Promise<void>;
  patUser: (conversationId: string, targetUserId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  setVoiceRecording: (conversationId: string, isRecording: boolean) => void;
  setupSocketListeners: () => void;
  addParticipant: (conversationId: string, target: User) => Promise<void>;
  updateGroupInfo: (
    conversationId: string,
    input: {
      title?: string;
      avatarUrl?: string;
      description?: string | null;
      welcomeMessage?: string | null;
      onlyAdminsCanSend?: boolean;
      slowModeSeconds?: number;
      noForwards?: boolean;
      requireAdminApproval?: boolean;
      membersCanAddMembers?: boolean;
      membersCanPinMessages?: boolean;
      membersCanChangeInfo?: boolean;
      membersCanSendMedia?: boolean;
      hideHistoryForNewMembers?: boolean;
      hideMembersList?: boolean;
      reactionsEnabled?: boolean;
    }
  ) => Promise<void>;
  removeParticipant: (conversationId: string, userId: string) => Promise<void>;
  banParticipant: (conversationId: string, userId: string) => Promise<void>;
  updateParticipantRole: (conversationId: string, userId: string, role: ParticipantRole) => Promise<void>;
  restrictParticipant: (conversationId: string, userId: string, restrictFor: RestrictDuration) => Promise<void>;
  updateParticipantCustomTitle: (conversationId: string, userId: string, customTitle: string | null) => Promise<void>;
  leaveGroup: (conversationId: string) => Promise<void>;
  createInviteLink: (conversationId: string, options?: { expiresInSeconds?: number | null; maxUses?: number | null }) => Promise<string>;
  revokeInviteLink: (conversationId: string) => Promise<void>;
  joinConversationByInvite: (invite: string) => Promise<Conversation | { pending: true }>;
}

function dropConversation<T>(record: Record<string, T>, conversationId: string): Record<string, T> {
  const next = { ...record };
  delete next[conversationId];
  return next;
}

const conversationKeyCache: Record<string, string> = {};

export function decryptReplyPreview(conversationKey: string, replyTo: ReplyToSnapshot): ReplyPreview {
  const base = { id: replyTo.id, senderId: replyTo.senderId, type: replyTo.type, deletedAt: replyTo.deletedAt };
  if (replyTo.deletedAt) return { ...base, text: null };

  try {
    const plaintext = decryptMessage(replyTo.ciphertext, replyTo.nonce, conversationKey);
    if (replyTo.type === "CONTACT") {
      const meta = JSON.parse(plaintext) as ContactCardMeta;
      return { ...base, text: meta.displayName };
    }
    if (replyTo.type === "POLL") {
      const meta = JSON.parse(plaintext) as PollMeta;
      return { ...base, text: meta.question };
    }
    if (MEDIA_TYPES.includes(replyTo.type)) {
      const meta = JSON.parse(plaintext) as MediaMeta;
      return { ...base, text: meta.caption ?? null };
    }
    return { ...base, text: plaintext };
  } catch {
    return { ...base, text: null };
  }
}

export function decryptToMessage(conversationKey: string, message: Message): DecryptedMessage {
  // SYSTEM messages carry a pre-rendered, unencrypted notice (e.g. "X added Y to the group").
  if (message.type === "SYSTEM") {
    return { ...message, text: message.ciphertext, meta: null, contactMeta: null, decryptFailed: false, replyPreview: null };
  }

  const replyPreview = message.replyTo ? decryptReplyPreview(conversationKey, message.replyTo) : null;

  if (message.deletedAt) {
    return { ...message, text: null, meta: null, contactMeta: null, decryptFailed: false, replyPreview };
  }

  let plaintext: string;
  try {
    plaintext = decryptMessage(message.ciphertext, message.nonce, conversationKey);
  } catch {
    return { ...message, text: null, meta: null, contactMeta: null, decryptFailed: true, replyPreview };
  }

  if (message.type === "CONTACT") {
    try {
      const contactMeta = JSON.parse(plaintext) as ContactCardMeta;
      return { ...message, text: contactMeta.displayName, meta: null, contactMeta, decryptFailed: false, replyPreview };
    } catch {
      return { ...message, text: null, meta: null, contactMeta: null, decryptFailed: true, replyPreview };
    }
  }

  if (message.type === "POLL") {
    try {
      const pollMeta = JSON.parse(plaintext) as PollMeta;
      return { ...message, text: pollMeta.question, meta: null, contactMeta: null, pollMeta, decryptFailed: false, replyPreview };
    } catch {
      return { ...message, text: null, meta: null, contactMeta: null, pollMeta: null, decryptFailed: true, replyPreview };
    }
  }

  if (MEDIA_TYPES.includes(message.type)) {
    try {
      const meta = JSON.parse(plaintext) as MediaMeta;
      return { ...message, text: meta.caption ?? null, meta, contactMeta: null, decryptFailed: false, replyPreview };
    } catch {
      return { ...message, text: null, meta: null, contactMeta: null, decryptFailed: true, replyPreview };
    }
  }

  return { ...message, text: plaintext, meta: null, contactMeta: null, decryptFailed: false, replyPreview };
}

function upsertConversation(conversations: Conversation[], conversation: Conversation): Conversation[] {
  const filtered = conversations.filter((c) => c.id !== conversation.id);
  if (conversation.isPinned) return [conversation, ...filtered];

  const insertAt = filtered.findIndex((c) => !c.isPinned);
  if (insertAt === -1) return [...filtered, conversation];
  return [...filtered.slice(0, insertAt), conversation, ...filtered.slice(insertAt)];
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messagesByConversation: {},
  hasMoreByConversation: {},
  scheduledMessagesByConversation: {},
  typingUsers: {},
  recordingUsers: {},
  onlineUsers: new Set(),
  isConnected: true,
  listenersRegistered: false,
  drafts: {},
  contactAliases: {},
  favoriteContactIds: new Set(),
  folders: [],
  reminders: [],

  loadConversations: async () => {
    const conversations = await chatsApi.list();
    set({ conversations });
  },

  loadContactAliases: async () => {
    const contacts = await contactsApi.list();
    const contactAliases: Record<string, string> = {};
    const favoriteContactIds = new Set<string>();
    for (const contact of contacts) {
      if (contact.alias) contactAliases[contact.user.id] = contact.alias;
      if (contact.isFavorite) favoriteContactIds.add(contact.user.id);
    }
    set({ contactAliases, favoriteContactIds });
  },

  loadFolders: async () => {
    const folders = await chatFoldersApi.list();
    set({ folders });
  },

  createFolder: async (name) => {
    const folder = await chatFoldersApi.create(name);
    set((state) => ({ folders: [...state.folders, folder] }));
    return folder;
  },

  renameFolder: async (folderId, name) => {
    const folder = await chatFoldersApi.update(folderId, { name });
    set((state) => ({ folders: state.folders.map((f) => (f.id === folderId ? folder : f)) }));
  },

  setFolderIcon: async (folderId, icon) => {
    const folder = await chatFoldersApi.update(folderId, { icon });
    set((state) => ({ folders: state.folders.map((f) => (f.id === folderId ? folder : f)) }));
  },

  reorderFolders: async (folderIds) => {
    const previous = get().folders;
    const reordered = folderIds
      .map((id) => previous.find((f) => f.id === id))
      .filter((f): f is ChatFolder => !!f);
    set({ folders: reordered });
    await Promise.all(reordered.map((f, index) => chatFoldersApi.update(f.id, { order: index })));
  },

  setFolderConversations: async (folderId, conversationIds) => {
    const folder = await chatFoldersApi.update(folderId, { conversationIds });
    set((state) => ({ folders: state.folders.map((f) => (f.id === folderId ? folder : f)) }));
  },

  setFolderFilters: async (folderId, filters) => {
    const folder = await chatFoldersApi.update(folderId, filters);
    set((state) => ({ folders: state.folders.map((f) => (f.id === folderId ? folder : f)) }));
  },

  deleteFolder: async (folderId) => {
    await chatFoldersApi.remove(folderId);
    set((state) => ({ folders: state.folders.filter((f) => f.id !== folderId) }));
  },

  loadDrafts: async () => {
    const drafts = await draftStorage.getAll();
    set({ drafts });
  },

  setDraft: async (conversationId, text) => {
    const drafts = { ...get().drafts };
    if (text.trim()) {
      drafts[conversationId] = text;
    } else {
      delete drafts[conversationId];
    }
    set({ drafts });
    await draftStorage.setAll(drafts);
  },

  getConversationKey: (conversation) => {
    if (conversationKeyCache[conversation.id]) return conversationKeyCache[conversation.id];

    const { keyPair } = useAuthStore.getState();
    if (!keyPair) throw new Error("E2EE kalitlari topilmadi");

    const key = unwrapConversationKey(
      conversation.wrappedKey,
      conversation.wrappedKeyNonce,
      conversation.keySenderPublicKey,
      keyPair.privateKey
    );
    conversationKeyCache[conversation.id] = key;
    return key;
  },

  loadMessages: async (conversationId) => {
    let conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) {
      conversation = await chatsApi.get(conversationId);
      set((state) => ({ conversations: upsertConversation(state.conversations, conversation!) }));
    }

    const key = get().getConversationKey(conversation);
    const messages = await chatsApi.listMessages(conversationId, undefined, PAGE_SIZE);
    const decrypted = messages.map((m) => decryptToMessage(key, m));

    set((state) => ({
      messagesByConversation: { ...state.messagesByConversation, [conversationId]: decrypted },
      hasMoreByConversation: { ...state.hasMoreByConversation, [conversationId]: messages.length === PAGE_SIZE },
    }));
  },

  loadOlderMessages: async (conversationId) => {
    if (get().hasMoreByConversation[conversationId] === false) return;

    const conversation = get().conversations.find((c) => c.id === conversationId);
    const existing = get().messagesByConversation[conversationId] ?? [];
    if (!conversation || existing.length === 0) return;

    const key = get().getConversationKey(conversation);
    const older = await chatsApi.listMessages(conversationId, existing[0].createdAt, PAGE_SIZE);
    const decryptedOlder = older.map((m) => decryptToMessage(key, m));

    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [...decryptedOlder, ...(state.messagesByConversation[conversationId] ?? [])],
      },
      hasMoreByConversation: { ...state.hasMoreByConversation, [conversationId]: older.length === PAGE_SIZE },
    }));
  },

  searchAllMessages: async (query) => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const results: { conversationId: string; message: DecryptedMessage }[] = [];

    await Promise.all(
      get().conversations.map(async (conversation) => {
        try {
          const key = get().getConversationKey(conversation);
          const messages = await chatsApi.listMessages(conversation.id, undefined, 50);
          for (const m of messages) {
            if (m.type !== "TEXT" || m.deletedAt) continue;
            const decrypted = decryptToMessage(key, m);
            if (!decrypted.decryptFailed && (decrypted.text ?? "").toLowerCase().includes(q)) {
              results.push({ conversationId: conversation.id, message: decrypted });
            }
          }
        } catch {
          // skip conversations whose messages can't be loaded/decrypted
        }
      })
    );

    results.sort((a, b) => new Date(b.message.createdAt).getTime() - new Date(a.message.createdAt).getTime());
    return results.slice(0, 30);
  },

  sendTextMessage: async (conversationId, text, replyToId, mentions, scheduledFor, silent) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error("Suhbat topilmadi");

    const key = get().getConversationKey(conversation);
    const { ciphertext, nonce } = encryptMessage(text, key);

    const message = await chatsApi.sendMessage(conversationId, {
      type: "TEXT",
      ciphertext,
      nonce,
      replyToId,
      mentions,
      scheduledFor,
      silent,
    });
    const decrypted = decryptToMessage(key, message);

    if (message.scheduledFor) {
      set((state) => ({
        scheduledMessagesByConversation: {
          ...state.scheduledMessagesByConversation,
          [conversationId]: [...(state.scheduledMessagesByConversation[conversationId] ?? []), decrypted],
        },
      }));
      return;
    }

    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      if (existing.some((m) => m.id === decrypted.id)) return state;
      return {
        messagesByConversation: { ...state.messagesByConversation, [conversationId]: [...existing, decrypted] },
        conversations: upsertConversation(
          state.conversations,
          { ...conversation, lastMessage: message, updatedAt: message.createdAt }
        ),
      };
    });
  },

  loadScheduledMessages: async (conversationId) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    const key = get().getConversationKey(conversation);
    const messages = await chatsApi.listScheduledMessages(conversationId);
    const decrypted = messages.map((m) => decryptToMessage(key, m));

    set((state) => ({
      scheduledMessagesByConversation: { ...state.scheduledMessagesByConversation, [conversationId]: decrypted },
    }));
  },

  cancelScheduledMessage: async (conversationId, messageId) => {
    await chatsApi.cancelScheduledMessage(conversationId, messageId);
    set((state) => ({
      scheduledMessagesByConversation: {
        ...state.scheduledMessagesByConversation,
        [conversationId]: (state.scheduledMessagesByConversation[conversationId] ?? []).filter((m) => m.id !== messageId),
      },
    }));
  },

  rescheduleMessage: async (conversationId, messageId, scheduledFor) => {
    const updated = await chatsApi.rescheduleMessage(conversationId, messageId, scheduledFor);
    set((state) => ({
      scheduledMessagesByConversation: {
        ...state.scheduledMessagesByConversation,
        [conversationId]: (state.scheduledMessagesByConversation[conversationId] ?? []).map((m) =>
          m.id === messageId ? { ...m, scheduledFor: updated.scheduledFor } : m
        ),
      },
    }));
  },

  // The published message arrives via the "message:new" socket event, which appends it to the chat.
  sendScheduledMessageNow: async (conversationId, messageId) => {
    await chatsApi.sendScheduledMessageNow(conversationId, messageId);
    set((state) => ({
      scheduledMessagesByConversation: {
        ...state.scheduledMessagesByConversation,
        [conversationId]: (state.scheduledMessagesByConversation[conversationId] ?? []).filter((m) => m.id !== messageId),
      },
    }));
  },

  sendMediaMessage: async (conversationId, asset, type, replyToId, viewOnce, caption, isSpoiler) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error("Suhbat topilmadi");

    const key = get().getConversationKey(conversation);
    const { url, size, fileNonce } = await encryptAndUploadFile(asset.uri, key);

    const meta: MediaMeta = {
      name: asset.name,
      mimeType: asset.mimeType,
      size,
      fileNonce,
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
      caption: caption || undefined,
    };
    const { ciphertext, nonce } = encryptMessage(JSON.stringify(meta), key);

    const message = await chatsApi.sendMessage(conversationId, {
      type,
      ciphertext,
      nonce,
      mediaUrl: url,
      replyToId,
      viewOnce,
      isSpoiler,
    });
    const decrypted = decryptToMessage(key, message);

    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      if (existing.some((m) => m.id === decrypted.id)) return state;
      return {
        messagesByConversation: { ...state.messagesByConversation, [conversationId]: [...existing, decrypted] },
        conversations: upsertConversation(
          state.conversations,
          { ...conversation, lastMessage: message, updatedAt: message.createdAt }
        ),
      };
    });
  },

  viewOnceMedia: async (conversationId, messageId) => {
    const updated = await chatsApi.viewMessage(conversationId, messageId);
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: existing.map((m) =>
            m.id === messageId ? { ...m, viewedAt: updated.viewedAt, mediaUrl: null } : m
          ),
        },
      };
    });
  },

  sendContactMessage: async (conversationId, contact, replyToId) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error("Suhbat topilmadi");

    const key = get().getConversationKey(conversation);
    const meta: ContactCardMeta = {
      userId: contact.id,
      username: contact.username,
      displayName: contact.displayName,
      avatarUrl: contact.avatarUrl,
    };
    const { ciphertext, nonce } = encryptMessage(JSON.stringify(meta), key);

    const message = await chatsApi.sendMessage(conversationId, { type: "CONTACT", ciphertext, nonce, replyToId });
    const decrypted = decryptToMessage(key, message);

    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      if (existing.some((m) => m.id === decrypted.id)) return state;
      return {
        messagesByConversation: { ...state.messagesByConversation, [conversationId]: [...existing, decrypted] },
        conversations: upsertConversation(
          state.conversations,
          { ...conversation, lastMessage: message, updatedAt: message.createdAt }
        ),
      };
    });
  },

  sendPollMessage: async (conversationId, question, options, multipleChoice, anonymous, replyToId, quizCorrectOptionIndex, closesInSeconds, quizExplanation) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error("Suhbat topilmadi");

    const key = get().getConversationKey(conversation);
    const meta: PollMeta = {
      question,
      options: options.map((text, i) => ({ id: String(i), text })),
      multipleChoice,
      anonymous,
      ...(quizCorrectOptionIndex !== undefined ? { quizCorrectOptionId: String(quizCorrectOptionIndex) } : {}),
      ...(quizExplanation ? { quizExplanation } : {}),
    };
    const { ciphertext, nonce } = encryptMessage(JSON.stringify(meta), key);

    const message = await chatsApi.sendMessage(conversationId, {
      type: "POLL",
      ciphertext,
      nonce,
      replyToId,
      pollAnonymous: anonymous,
      pollClosesInSeconds: closesInSeconds,
    });
    const decrypted = decryptToMessage(key, message);

    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      if (existing.some((m) => m.id === decrypted.id)) return state;
      return {
        messagesByConversation: { ...state.messagesByConversation, [conversationId]: [...existing, decrypted] },
        conversations: upsertConversation(
          state.conversations,
          { ...conversation, lastMessage: message, updatedAt: message.createdAt }
        ),
      };
    });
  },

  votePoll: async (conversationId, messageId, optionIds) => {
    const { votes } = await chatsApi.votePoll(conversationId, messageId, optionIds);
    recentSelfPollVotes.set(messageId, Date.now());
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: existing.map((m) => (m.id === messageId ? { ...m, pollVotes: votes } : m)),
        },
      };
    });
  },

  closePoll: async (conversationId, messageId) => {
    const { pollClosedAt } = await chatsApi.closePoll(conversationId, messageId);
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: existing.map((m) => (m.id === messageId ? { ...m, pollClosedAt } : m)),
        },
      };
    });
  },

  deleteMessage: async (conversationId, messageId) => {
    const updated = await chatsApi.deleteMessage(conversationId, messageId);
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: existing.map((m) =>
            m.id === messageId ? { ...m, ...updated, text: null, meta: null, contactMeta: null, decryptFailed: false } : m
          ),
        },
      };
    });
  },

  hideMessageForMe: async (conversationId, messageId) => {
    await chatsApi.hideMessageForMe(conversationId, messageId);
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: existing.filter((m) => m.id !== messageId),
        },
      };
    });
  },

  editMessage: async (conversationId, messageId, text, mentions) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error("Suhbat topilmadi");

    const key = get().getConversationKey(conversation);

    const existing = (get().messagesByConversation[conversationId] ?? []).find((m) => m.id === messageId);

    let payload = text;
    if (existing && MEDIA_TYPES.includes(existing.type) && existing.meta) {
      const meta: MediaMeta = { ...existing.meta, caption: text || undefined };
      payload = JSON.stringify(meta);
    }

    const { ciphertext, nonce } = encryptMessage(payload, key);

    const updated = await chatsApi.editMessage(conversationId, messageId, { ciphertext, nonce, mentions });
    const decrypted = decryptToMessage(key, updated);

    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: existing.map((m) => (m.id === messageId ? decrypted : m)),
        },
      };
    });
  },

  toggleReaction: async (conversationId, messageId, emoji) => {
    const { reactions } = await chatsApi.setReaction(conversationId, messageId, emoji);
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: existing.map((m) => (m.id === messageId ? { ...m, reactions } : m)),
        },
      };
    });
  },

  toggleStar: async (conversationId, messageId) => {
    const { starred } = await chatsApi.toggleStar(conversationId, messageId);
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: existing.map((m) => (m.id === messageId ? { ...m, isStarred: starred } : m)),
        },
      };
    });
  },

  forwardMessage: async (sourceConversationId, messageId, targetConversationId, hideSender) => {
    const sourceConversation = get().conversations.find((c) => c.id === sourceConversationId);
    const targetConversation = get().conversations.find((c) => c.id === targetConversationId);
    if (!sourceConversation || !targetConversation) throw new Error("Suhbat topilmadi");

    const message = (get().messagesByConversation[sourceConversationId] ?? []).find((m) => m.id === messageId);
    if (!message || message.deletedAt || message.decryptFailed) throw new Error("Xabarni yo'naltirib bo'lmadi");

    const sourceKey = get().getConversationKey(sourceConversation);
    const targetKey = get().getConversationKey(targetConversation);

    const currentUser = useAuthStore.getState().user;
    const aliases = get().contactAliases;
    const forwardedFromName = hideSender
      ? undefined
      : message.forwardedFromName ??
        (message.senderId === currentUser?.id
          ? currentUser.displayName
          : aliases[message.senderId] ??
            sourceConversation.participants.find((p) => p.userId === message.senderId)?.user.displayName);
    const forwardedFromUserId = hideSender ? undefined : message.forwardedFromUserId ?? message.senderId;
    const forwardCount = hideSender ? 0 : (message.forwardCount ?? 0) + 1;

    let sentMessage: Message;
    if (MEDIA_TYPES.includes(message.type) && message.mediaUrl && message.meta) {
      const localUri = await downloadAndDecryptFile(
        message.mediaUrl,
        message.meta.fileNonce,
        sourceKey,
        `${message.id}${extensionFromName(message.meta.name)}`
      );
      const { url, size, fileNonce } = await encryptAndUploadFile(localUri, targetKey);
      const meta: MediaMeta = { ...message.meta, size, fileNonce, caption: undefined };
      const { ciphertext, nonce } = encryptMessage(JSON.stringify(meta), targetKey);
      sentMessage = await chatsApi.sendMessage(targetConversationId, {
        type: message.type,
        ciphertext,
        nonce,
        mediaUrl: url,
        forwardedFromName,
        forwardedFromUserId,
        forwardCount,
      });
    } else if (message.type === "CONTACT" && message.contactMeta) {
      const { ciphertext, nonce } = encryptMessage(JSON.stringify(message.contactMeta), targetKey);
      sentMessage = await chatsApi.sendMessage(targetConversationId, { type: "CONTACT", ciphertext, nonce, forwardedFromName, forwardedFromUserId, forwardCount });
    } else if (message.type === "POLL" && message.pollMeta) {
      const { ciphertext, nonce } = encryptMessage(JSON.stringify(message.pollMeta), targetKey);
      sentMessage = await chatsApi.sendMessage(targetConversationId, { type: "POLL", ciphertext, nonce, forwardedFromName, forwardedFromUserId, forwardCount });
    } else {
      const { ciphertext, nonce } = encryptMessage(message.text ?? "", targetKey);
      sentMessage = await chatsApi.sendMessage(targetConversationId, { type: "TEXT", ciphertext, nonce, forwardedFromName, forwardedFromUserId, forwardCount });
    }

    const decrypted = decryptToMessage(targetKey, sentMessage);
    set((state) => {
      const existing = state.messagesByConversation[targetConversationId] ?? [];
      if (existing.some((m) => m.id === decrypted.id)) return state;
      return {
        messagesByConversation: { ...state.messagesByConversation, [targetConversationId]: [...existing, decrypted] },
        conversations: upsertConversation(
          state.conversations,
          { ...targetConversation, lastMessage: sentMessage, updatedAt: sentMessage.createdAt }
        ),
      };
    });
  },

  createDirectConversation: async (target) => {
    const { user, keyPair } = useAuthStore.getState();
    if (!user || !keyPair) throw new Error("Avtorizatsiyadan o'tilmagan");

    const conversationKey = generateConversationKey();
    const participants = [user, target].map((u) => ({
      userId: u.id,
      ...wrapConversationKey(conversationKey, u.publicKey, keyPair.privateKey),
    }));

    const conversation = await chatsApi.create({
      type: "DIRECT",
      keySenderPublicKey: keyPair.publicKey,
      participants,
    });

    conversationKeyCache[conversation.id] = conversationKey;
    set((state) => ({ conversations: upsertConversation(state.conversations, conversation) }));
    return conversation;
  },

  getOrCreateSavedMessages: async () => {
    const existing = get().conversations.find((c) => c.isSelf);
    if (existing) return existing;

    const { user, keyPair } = useAuthStore.getState();
    if (!user || !keyPair) throw new Error("Avtorizatsiyadan o'tilmagan");

    const conversationKey = generateConversationKey();
    const participants = [
      { userId: user.id, ...wrapConversationKey(conversationKey, user.publicKey, keyPair.privateKey) },
    ];

    const conversation = await chatsApi.create({
      type: "DIRECT",
      keySenderPublicKey: keyPair.publicKey,
      participants,
    });

    conversationKeyCache[conversation.id] = conversationKey;
    set((state) => ({ conversations: upsertConversation(state.conversations, conversation) }));
    return conversation;
  },

  createGroupConversation: async (title, members) => {
    const { user, keyPair } = useAuthStore.getState();
    if (!user || !keyPair) throw new Error("Avtorizatsiyadan o'tilmagan");

    const conversationKey = generateConversationKey();
    const participants = [user, ...members].map((u) => ({
      userId: u.id,
      ...wrapConversationKey(conversationKey, u.publicKey, keyPair.privateKey),
    }));

    const conversation = await chatsApi.create({
      type: "GROUP",
      title,
      keySenderPublicKey: keyPair.publicKey,
      participants,
    });

    conversationKeyCache[conversation.id] = conversationKey;
    set((state) => ({ conversations: upsertConversation(state.conversations, conversation) }));
    return conversation;
  },

  markRead: async (conversationId, upToMessageId, upToCreatedAt) => {
    await chatsApi.markRead(conversationId, upToMessageId);
    getSocket()?.emit("message:read", { conversationId });
    set((state) => ({
      conversations: state.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        const candidate = upToCreatedAt ?? new Date().toISOString();
        // Never move the read marker backward client-side either.
        const lastReadAt = c.lastReadAt && new Date(c.lastReadAt) >= new Date(candidate) ? c.lastReadAt : candidate;
        return { ...c, lastReadAt, hasUnreadMention: false };
      }),
    }));
  },

  markAllRead: async (conversationIds) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;
    const scope = conversationIds ? new Set(conversationIds) : null;
    const unread = get().conversations.filter(
      (c) => !c.isArchived && isConversationUnread(c, userId) && (!scope || scope.has(c.id))
    );
    if (unread.length === 0) return;
    const now = new Date().toISOString();
    await Promise.all(
      unread.map((c) => {
        getSocket()?.emit("message:read", { conversationId: c.id });
        return chatsApi.markRead(c.id);
      })
    );
    set((state) => ({
      conversations: state.conversations.map((c) =>
        unread.some((u) => u.id === c.id) ? { ...c, lastReadAt: now, markedUnread: false, hasUnreadMention: false } : c
      ),
    }));
  },

  togglePin: async (conversationId) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    const updated = await chatsApi.updatePreferences(conversationId, { isPinned: !conversation.isPinned });
    set((state) => ({
      conversations: upsertConversation(state.conversations, { ...conversation, ...updated }),
    }));
  },

  reorderPinned: async (conversationId, direction) => {
    const conversations = await chatsApi.reorderPinned(conversationId, direction);
    set({ conversations });
  },

  muteConversation: async (conversationId, muteFor) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    const updated = await chatsApi.updatePreferences(conversationId, { muteFor });
    set((state) => ({
      conversations: upsertConversation(state.conversations, { ...conversation, ...updated }),
    }));
  },

  setNotificationPreview: async (conversationId, notificationPreview) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    const updated = await chatsApi.updatePreferences(conversationId, { notificationPreview });
    set((state) => ({
      conversations: upsertConversation(state.conversations, { ...conversation, ...updated }),
    }));
  },

  setReadReceiptsOverride: async (conversationId, readReceiptsOverride) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    const updated = await chatsApi.updatePreferences(conversationId, { readReceiptsOverride });
    set((state) => ({
      conversations: upsertConversation(state.conversations, { ...conversation, ...updated }),
    }));
  },

  setAutoDelete: async (conversationId, autoDeleteAfterSeconds) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    const updated = await chatsApi.updatePreferences(conversationId, { autoDeleteAfterSeconds });
    set((state) => ({
      conversations: upsertConversation(state.conversations, { ...conversation, ...updated }),
    }));
  },

  toggleMutedSender: async (conversationId, userId) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    const isMuted = conversation.mutedSenderIds.includes(userId);
    const mutedSenderIds = isMuted
      ? conversation.mutedSenderIds.filter((id) => id !== userId)
      : [...conversation.mutedSenderIds, userId];
    const updated = await chatsApi.updatePreferences(conversationId, { mutedSenderIds });
    set((state) => ({
      conversations: upsertConversation(state.conversations, { ...conversation, ...updated }),
    }));
  },

  toggleArchive: async (conversationId) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    const updated = await chatsApi.updatePreferences(conversationId, { isArchived: !conversation.isArchived });
    set((state) => ({
      conversations: upsertConversation(state.conversations, { ...conversation, ...updated }),
    }));
  },

  toggleUnread: async (conversationId) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    const userId = useAuthStore.getState().user?.id;
    if (!conversation || !userId) return;

    if (isConversationUnread(conversation, userId)) {
      await chatsApi.markRead(conversationId);
      set((state) => ({
        conversations: upsertConversation(state.conversations, {
          ...conversation,
          lastReadAt: new Date().toISOString(),
          markedUnread: false,
          hasUnreadMention: false,
        }),
      }));
    } else {
      const updated = await chatsApi.updatePreferences(conversationId, { markedUnread: true });
      set((state) => ({
        conversations: upsertConversation(state.conversations, { ...conversation, ...updated }),
      }));
    }
  },

  clearHistory: async (conversationId, olderThanDays) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    await chatsApi.clearHistory(conversationId, olderThanDays);

    if (olderThanDays === undefined) {
      set((state) => ({
        messagesByConversation: { ...state.messagesByConversation, [conversationId]: [] },
        hasMoreByConversation: { ...state.hasMoreByConversation, [conversationId]: false },
        conversations: upsertConversation(state.conversations, { ...conversation, lastMessage: null }),
      }));
      return;
    }

    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    set((state) => {
      const remaining = (state.messagesByConversation[conversationId] ?? []).filter(
        (m) => new Date(m.createdAt).getTime() >= cutoff
      );
      const lastMessage =
        conversation.lastMessage && new Date(conversation.lastMessage.createdAt).getTime() < cutoff
          ? null
          : conversation.lastMessage;
      return {
        messagesByConversation: { ...state.messagesByConversation, [conversationId]: remaining },
        conversations: upsertConversation(state.conversations, { ...conversation, lastMessage }),
      };
    });
  },

  deleteConversation: async (conversationId) => {
    await chatsApi.deleteConversation(conversationId);
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== conversationId),
      messagesByConversation: dropConversation(state.messagesByConversation, conversationId),
      hasMoreByConversation: dropConversation(state.hasMoreByConversation, conversationId),
    }));
  },

  deleteConversationForEveryone: async (conversationId) => {
    await chatsApi.deleteConversationForEveryone(conversationId);
    delete conversationKeyCache[conversationId];
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== conversationId),
      messagesByConversation: dropConversation(state.messagesByConversation, conversationId),
      hasMoreByConversation: dropConversation(state.hasMoreByConversation, conversationId),
    }));
  },

  pinMessage: async (conversationId, messageId, expiresInSeconds) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    const updated = await chatsApi.pinMessage(conversationId, messageId, expiresInSeconds);
    set((state) => ({
      conversations: upsertConversation(state.conversations, { ...conversation, ...updated }),
    }));
  },

  unpinMessage: async (conversationId, messageId) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    const updated = await chatsApi.unpinMessage(conversationId, messageId);
    set((state) => ({
      conversations: upsertConversation(state.conversations, { ...conversation, ...updated }),
    }));
  },

  unpinAllMessages: async (conversationId) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    const updated = await chatsApi.unpinAllMessages(conversationId);
    set((state) => ({
      conversations: upsertConversation(state.conversations, { ...conversation, ...updated }),
    }));
  },

  fetchReminders: async () => {
    const reminders = await chatsApi.listReminders();
    set({ reminders });
  },

  setReminder: async (conversationId, messageId, remindInSeconds) => {
    await chatsApi.setReminder(conversationId, messageId, remindInSeconds);
  },

  cancelReminder: async (conversationId, messageId) => {
    await chatsApi.cancelReminder(conversationId, messageId);
    set((state) => ({ reminders: state.reminders.filter((r) => r.message.id !== messageId) }));
  },

  setDisappearingMessages: async (conversationId, disappearingSeconds) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    const updated = await chatsApi.setDisappearingMessages(conversationId, disappearingSeconds);
    set((state) => ({
      conversations: upsertConversation(state.conversations, { ...conversation, ...updated }),
    }));
  },

  setNoForwards: async (conversationId, noForwards) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    const updated = await chatsApi.setNoForwards(conversationId, noForwards);
    set((state) => ({
      conversations: upsertConversation(state.conversations, { ...conversation, ...updated }),
    }));
  },

  // The resulting system message arrives via the "message:new" socket event for all participants, including us.
  patUser: async (conversationId, targetUserId) => {
    await chatsApi.pat(conversationId, targetUserId);
  },

  blockUser: async (userId) => {
    await contactsApi.block(userId);
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.type === "DIRECT" && c.participants.some((p) => p.userId === userId) ? { ...c, isBlocked: true } : c
      ),
    }));
  },

  unblockUser: async (userId) => {
    await contactsApi.unblock(userId);
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.type === "DIRECT" && c.participants.some((p) => p.userId === userId) ? { ...c, isBlocked: false } : c
      ),
    }));
  },

  addParticipant: async (conversationId, target) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error("Suhbat topilmadi");

    const { keyPair } = useAuthStore.getState();
    if (!keyPair) throw new Error("Avtorizatsiyadan o'tilmagan");

    const conversationKey = get().getConversationKey(conversation);
    const wrapped = wrapConversationKey(conversationKey, target.publicKey, keyPair.privateKey);

    const updated = await chatsApi.addParticipant(conversationId, {
      userId: target.id,
      wrappedKey: wrapped.wrappedKey,
      wrappedKeyNonce: wrapped.wrappedKeyNonce,
      keySenderPublicKey: keyPair.publicKey,
    });

    set((state) => ({ conversations: upsertConversation(state.conversations, updated) }));
  },

  updateGroupInfo: async (conversationId, input) => {
    const updated = await chatsApi.update(conversationId, input);
    set((state) => {
      const existing = state.conversations.find((c) => c.id === conversationId);
      const merged = existing
        ? {
            ...updated,
            wrappedKey: existing.wrappedKey,
            wrappedKeyNonce: existing.wrappedKeyNonce,
            keySenderPublicKey: existing.keySenderPublicKey,
          }
        : updated;
      return { conversations: upsertConversation(state.conversations, merged) };
    });
  },

  removeParticipant: async (conversationId, userId) => {
    const updated = await chatsApi.removeParticipant(conversationId, userId);
    set((state) => {
      const existing = state.conversations.find((c) => c.id === conversationId);
      const merged = existing
        ? {
            ...updated,
            wrappedKey: existing.wrappedKey,
            wrappedKeyNonce: existing.wrappedKeyNonce,
            keySenderPublicKey: existing.keySenderPublicKey,
          }
        : updated;
      return { conversations: upsertConversation(state.conversations, merged) };
    });
  },

  banParticipant: async (conversationId, userId) => {
    const updated = await chatsApi.banParticipant(conversationId, userId);
    set((state) => {
      const existing = state.conversations.find((c) => c.id === conversationId);
      const merged = existing
        ? {
            ...updated,
            wrappedKey: existing.wrappedKey,
            wrappedKeyNonce: existing.wrappedKeyNonce,
            keySenderPublicKey: existing.keySenderPublicKey,
          }
        : updated;
      return { conversations: upsertConversation(state.conversations, merged) };
    });
  },

  updateParticipantRole: async (conversationId, userId, role) => {
    const updated = await chatsApi.updateParticipantRole(conversationId, userId, role);
    set((state) => {
      const existing = state.conversations.find((c) => c.id === conversationId);
      const merged = existing
        ? {
            ...updated,
            wrappedKey: existing.wrappedKey,
            wrappedKeyNonce: existing.wrappedKeyNonce,
            keySenderPublicKey: existing.keySenderPublicKey,
          }
        : updated;
      return { conversations: upsertConversation(state.conversations, merged) };
    });
  },

  restrictParticipant: async (conversationId, userId, restrictFor) => {
    const updated = await chatsApi.restrictParticipant(conversationId, userId, restrictFor);
    set((state) => {
      const existing = state.conversations.find((c) => c.id === conversationId);
      const merged = existing
        ? {
            ...updated,
            wrappedKey: existing.wrappedKey,
            wrappedKeyNonce: existing.wrappedKeyNonce,
            keySenderPublicKey: existing.keySenderPublicKey,
          }
        : updated;
      return { conversations: upsertConversation(state.conversations, merged) };
    });
  },

  updateParticipantCustomTitle: async (conversationId, userId, customTitle) => {
    const updated = await chatsApi.updateParticipantCustomTitle(conversationId, userId, customTitle);
    set((state) => {
      const existing = state.conversations.find((c) => c.id === conversationId);
      const merged = existing
        ? {
            ...updated,
            wrappedKey: existing.wrappedKey,
            wrappedKeyNonce: existing.wrappedKeyNonce,
            keySenderPublicKey: existing.keySenderPublicKey,
          }
        : updated;
      return { conversations: upsertConversation(state.conversations, merged) };
    });
  },

  leaveGroup: async (conversationId) => {
    await chatsApi.leave(conversationId);
    delete conversationKeyCache[conversationId];
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== conversationId),
      messagesByConversation: dropConversation(state.messagesByConversation, conversationId),
      hasMoreByConversation: dropConversation(state.hasMoreByConversation, conversationId),
    }));
  },

  createInviteLink: async (conversationId, options) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error("Suhbat topilmadi");

    const { inviteCode, inviteCodeExpiresAt, inviteCodeMaxUses, inviteCodeUseCount } = await chatsApi.createInviteLink(
      conversationId,
      options
    );
    set((state) => ({
      conversations: upsertConversation(state.conversations, {
        ...conversation,
        inviteCode,
        inviteCodeExpiresAt,
        inviteCodeMaxUses,
        inviteCodeUseCount,
      }),
    }));

    const conversationKey = get().getConversationKey(conversation);
    return encodeInviteLink(inviteCode, conversationKey);
  },

  revokeInviteLink: async (conversationId) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;

    await chatsApi.revokeInviteLink(conversationId);
    set((state) => ({
      conversations: upsertConversation(state.conversations, {
        ...conversation,
        inviteCode: null,
        inviteCodeExpiresAt: null,
        inviteCodeMaxUses: null,
        inviteCodeUseCount: 0,
      }),
    }));
  },

  joinConversationByInvite: async (invite) => {
    const decoded = decodeInviteLink(invite);
    if (!decoded) throw new Error("Taklif havolasi noto'g'ri");

    const { keyPair } = useAuthStore.getState();
    if (!keyPair) throw new Error("Avtorizatsiyadan o'tilmagan");

    const wrapped = wrapConversationKey(decoded.key, keyPair.publicKey, keyPair.privateKey);
    const result = await chatsApi.joinByInvite(decoded.code, {
      wrappedKey: wrapped.wrappedKey,
      wrappedKeyNonce: wrapped.wrappedKeyNonce,
      keySenderPublicKey: keyPair.publicKey,
    });

    if ("pending" in result) return result;

    set((state) => ({ conversations: upsertConversation(state.conversations, result) }));
    return result;
  },

  setTyping: (conversationId, isTyping) => {
    getSocket()?.emit("typing", { conversationId, isTyping });
  },

  setVoiceRecording: (conversationId, isRecording) => {
    getSocket()?.emit("voice-recording", { conversationId, isRecording });
  },

  setupSocketListeners: () => {
    if (get().listenersRegistered) return;
    const socket = getSocket();
    if (!socket) return;

    set({ isConnected: socket.connected });
    socket.on("connect", () => set({ isConnected: true }));
    socket.on("disconnect", () => set({ isConnected: false }));

    socket.on("message:new", (message: Message) => {
      const conversation = get().conversations.find((c) => c.id === message.conversationId);
      if (!conversation) return;

      const currentUser = useAuthStore.getState().user;
      if (message.senderId !== currentUser?.id) {
        getSocket()?.emit("message:delivered", { conversationId: message.conversationId });
      }

      const key = get().getConversationKey(conversation);
      const decrypted = decryptToMessage(key, message);

      if (
        message.senderId !== currentUser?.id &&
        message.type !== "SYSTEM" &&
        !conversation.isMuted &&
        message.conversationId !== getActiveConversationId()
      ) {
        const display = getConversationDisplay(conversation, currentUser!.id, get().contactAliases);
        const senderName =
          conversation.type === "GROUP"
            ? conversation.participants.find((p) => p.userId === message.senderId)?.user.displayName
            : undefined;
        const preview = messagePreviewText(decrypted);
        useToastStore.getState().showToast({
          conversationId: message.conversationId,
          title: display.title,
          body: senderName ? `${senderName}: ${preview}` : preview,
          avatarUrl: display.avatarUrl,
        });
      }

      set((state) => {
        const existing = state.messagesByConversation[message.conversationId] ?? [];
        const scheduled = state.scheduledMessagesByConversation[message.conversationId];
        const nextScheduled = scheduled?.some((m) => m.id === decrypted.id)
          ? { [message.conversationId]: scheduled.filter((m) => m.id !== decrypted.id) }
          : null;

        if (existing.some((m) => m.id === decrypted.id)) {
          return nextScheduled
            ? { scheduledMessagesByConversation: { ...state.scheduledMessagesByConversation, ...nextScheduled } }
            : state;
        }
        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [message.conversationId]: [...existing, decrypted],
          },
          conversations: upsertConversation(state.conversations, {
            ...conversation,
            lastMessage: message,
            updatedAt: message.createdAt,
            hasUnreadMention: conversation.hasUnreadMention || !!message.mentions?.includes(currentUser?.id ?? ""),
          }),
          ...(nextScheduled
            ? { scheduledMessagesByConversation: { ...state.scheduledMessagesByConversation, ...nextScheduled } }
            : {}),
        };
      });
    });

    socket.on("message:deleted", (message: Message) => {
      set((state) => {
        const existing = state.messagesByConversation[message.conversationId] ?? [];
        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [message.conversationId]: existing.map((m) =>
              m.id === message.id ? { ...m, ...message, text: null, meta: null, contactMeta: null, decryptFailed: false } : m
            ),
          },
        };
      });
    });

    socket.on("message:edited", (message: Message) => {
      const conversation = get().conversations.find((c) => c.id === message.conversationId);
      if (!conversation) return;

      const key = get().getConversationKey(conversation);
      const decrypted = decryptToMessage(key, message);

      set((state) => {
        const existing = state.messagesByConversation[message.conversationId] ?? [];
        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [message.conversationId]: existing.map((m) =>
              m.id === message.id ? { ...decrypted, isStarred: m.isStarred } : m
            ),
          },
        };
      });
    });

    socket.on(
      "message:viewed",
      ({ conversationId, messageId, viewedAt }: { conversationId: string; messageId: string; viewedAt: string }) => {
        set((state) => {
          const existing = state.messagesByConversation[conversationId] ?? [];
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: existing.map((m) => (m.id === messageId ? { ...m, viewedAt, mediaUrl: null } : m)),
            },
          };
        });
      }
    );

    socket.on("conversation:new", (conversation: Conversation) => {
      set((state) => ({ conversations: upsertConversation(state.conversations, conversation) }));
    });

    socket.on("conversation:updated", (conversation: Conversation) => {
      set((state) => {
        const existing = state.conversations.find((c) => c.id === conversation.id);
        // The broadcaster's wrapped key and per-participant preferences are meaningless to us; keep our own.
        const merged = existing
          ? {
              ...conversation,
              wrappedKey: existing.wrappedKey,
              wrappedKeyNonce: existing.wrappedKeyNonce,
              keySenderPublicKey: existing.keySenderPublicKey,
              lastReadAt: existing.lastReadAt,
              isPinned: existing.isPinned,
              isMuted: existing.isMuted,
              mutedUntil: existing.mutedUntil,
              isArchived: existing.isArchived,
              markedUnread: existing.markedUnread,
              inviteCode: existing.inviteCode,
              inviteCodeExpiresAt: existing.inviteCodeExpiresAt,
              inviteCodeMaxUses: existing.inviteCodeMaxUses,
              inviteCodeUseCount: existing.inviteCodeUseCount,
            }
          : conversation;
        return { conversations: upsertConversation(state.conversations, merged) };
      });
    });

    socket.on("conversation:participantRemoved", ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      const selfId = useAuthStore.getState().user?.id;
      if (userId === selfId) {
        delete conversationKeyCache[conversationId];
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== conversationId),
          messagesByConversation: dropConversation(state.messagesByConversation, conversationId),
          hasMoreByConversation: dropConversation(state.hasMoreByConversation, conversationId),
        }));
        return;
      }

      set((state) => {
        const conversation = state.conversations.find((c) => c.id === conversationId);
        if (!conversation) return state;
        return {
          conversations: upsertConversation(state.conversations, {
            ...conversation,
            participants: conversation.participants.filter((p) => p.userId !== userId),
          }),
        };
      });
    });

    socket.on("conversation:deleted", ({ conversationId }: { conversationId: string }) => {
      delete conversationKeyCache[conversationId];
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== conversationId),
        messagesByConversation: dropConversation(state.messagesByConversation, conversationId),
        hasMoreByConversation: dropConversation(state.hasMoreByConversation, conversationId),
      }));
    });

    socket.on("typing", ({ conversationId, userId, isTyping }: { conversationId: string; userId: string; isTyping: boolean }) => {
      set((state) => {
        const current = new Set(state.typingUsers[conversationId] ?? []);
        if (isTyping) current.add(userId);
        else current.delete(userId);
        return { typingUsers: { ...state.typingUsers, [conversationId]: current } };
      });
    });

    socket.on("voice-recording", ({ conversationId, userId, isRecording }: { conversationId: string; userId: string; isRecording: boolean }) => {
      set((state) => {
        const current = new Set(state.recordingUsers[conversationId] ?? []);
        if (isRecording) current.add(userId);
        else current.delete(userId);
        return { recordingUsers: { ...state.recordingUsers, [conversationId]: current } };
      });
    });

    socket.on(
      "message:reaction",
      ({ conversationId, messageId, reactions }: { conversationId: string; messageId: string; reactions: MessageReaction[] }) => {
        set((state) => {
          const existing = state.messagesByConversation[conversationId] ?? [];
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: existing.map((m) => (m.id === messageId ? { ...m, reactions } : m)),
            },
          };
        });
      }
    );

    socket.on(
      "message:pollVote",
      ({ conversationId, messageId, votes }: { conversationId: string; messageId: string; votes: PollVote[] }) => {
        const recentAt = recentSelfPollVotes.get(messageId);
        if (recentAt && Date.now() - recentAt < SELF_VOTE_GRACE_MS) return;
        set((state) => {
          const existing = state.messagesByConversation[conversationId] ?? [];
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: existing.map((m) => (m.id === messageId ? { ...m, pollVotes: votes } : m)),
            },
          };
        });
      }
    );

    socket.on(
      "message:pollClosed",
      ({ conversationId, messageId, pollClosedAt }: { conversationId: string; messageId: string; pollClosedAt: string }) => {
        set((state) => {
          const existing = state.messagesByConversation[conversationId] ?? [];
          return {
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: existing.map((m) => (m.id === messageId ? { ...m, pollClosedAt } : m)),
            },
          };
        });
      }
    );

    socket.on("pinnedMessage:expired", ({ conversationId, messageId }: { conversationId: string; messageId: string }) => {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, pinnedMessages: c.pinnedMessages.filter((pm) => pm.id !== messageId) }
            : c
        ),
      }));
    });

    socket.on("message:reminderDue", ({ messageId }: { conversationId: string; messageId: string }) => {
      set((state) => ({ reminders: state.reminders.filter((r) => r.message.id !== messageId) }));
    });

    socket.on("conversation:autoDeleted", ({ conversationId }: { conversationId: string }) => {
      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== conversationId),
        messagesByConversation: dropConversation(state.messagesByConversation, conversationId),
        hasMoreByConversation: dropConversation(state.hasMoreByConversation, conversationId),
      }));
    });

    socket.on("message:read", ({ conversationId, userId, at }: { conversationId: string; userId: string; at: string }) => {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, participants: c.participants.map((p) => (p.userId === userId ? { ...p, lastReadAt: at } : p)) }
            : c
        ),
      }));
    });

    socket.on("message:delivered", ({ conversationId, userId, at }: { conversationId: string; userId: string; at: string }) => {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, participants: c.participants.map((p) => (p.userId === userId ? { ...p, lastDeliveredAt: at } : p)) }
            : c
        ),
      }));
    });

    socket.on("presence:initial", ({ userIds }: { userIds: string[] }) => {
      set({ onlineUsers: new Set(userIds) });
    });

    socket.on("presence:update", ({ userId, online }: { userId: string; online: boolean }) => {
      set((state) => {
        const onlineUsers = new Set(state.onlineUsers);
        if (online) onlineUsers.add(userId);
        else onlineUsers.delete(userId);

        if (online) return { onlineUsers };

        const lastSeenAt = new Date().toISOString();
        return {
          onlineUsers,
          conversations: state.conversations.map((c) => ({
            ...c,
            participants: c.participants.map((p) =>
              p.userId === userId ? { ...p, user: { ...p.user, lastSeenAt } } : p
            ),
          })),
        };
      });
    });

    set({ listenersRegistered: true });
  },
}));
