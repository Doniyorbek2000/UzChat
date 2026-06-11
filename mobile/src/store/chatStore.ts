import { create } from "zustand";
import { chatsApi } from "../api/chats";
import { contactsApi } from "../api/contacts";
import { getSocket } from "../socket/socket";
import { useAuthStore } from "./authStore";
import {
  decryptMessage,
  encryptMessage,
  generateConversationKey,
  unwrapConversationKey,
  wrapConversationKey,
} from "../crypto/e2ee";
import { downloadAndDecryptFile, encryptAndUploadFile, extensionFromName } from "../utils/mediaFile";
import { draftStorage } from "../storage/draftStorage";
import { isConversationUnread } from "../utils/conversation";
import {
  Conversation,
  Message,
  MediaAsset,
  MediaMeta,
  MessageReaction,
  MessageType,
  ParticipantRole,
  ReplyToSnapshot,
  User,
} from "../types";

export interface DecryptedMessage extends Message {
  text: string | null;
  meta: MediaMeta | null;
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

interface ChatState {
  conversations: Conversation[];
  messagesByConversation: Record<string, DecryptedMessage[]>;
  hasMoreByConversation: Record<string, boolean>;
  typingUsers: Record<string, Set<string>>;
  onlineUsers: Set<string>;
  listenersRegistered: boolean;
  drafts: Record<string, string>;

  loadConversations: () => Promise<void>;
  loadDrafts: () => Promise<void>;
  setDraft: (conversationId: string, text: string) => Promise<void>;
  getConversationKey: (conversation: Conversation) => string;
  loadMessages: (conversationId: string) => Promise<void>;
  loadOlderMessages: (conversationId: string) => Promise<void>;
  sendTextMessage: (conversationId: string, text: string, replyToId?: string, mentions?: string[]) => Promise<void>;
  sendMediaMessage: (conversationId: string, asset: MediaAsset, type: MessageType, replyToId?: string) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  editMessage: (conversationId: string, messageId: string, text: string, mentions?: string[]) => Promise<void>;
  toggleReaction: (conversationId: string, messageId: string, emoji: string) => Promise<void>;
  toggleStar: (conversationId: string, messageId: string) => Promise<void>;
  forwardMessage: (sourceConversationId: string, messageId: string, targetConversationId: string) => Promise<void>;
  createDirectConversation: (target: User) => Promise<Conversation>;
  createGroupConversation: (title: string, members: User[]) => Promise<Conversation>;
  markRead: (conversationId: string) => Promise<void>;
  togglePin: (conversationId: string) => Promise<void>;
  toggleMute: (conversationId: string) => Promise<void>;
  toggleArchive: (conversationId: string) => Promise<void>;
  toggleUnread: (conversationId: string) => Promise<void>;
  clearHistory: (conversationId: string) => Promise<void>;
  setPinnedMessage: (conversationId: string, messageId: string | null) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (userId: string) => Promise<void>;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  setupSocketListeners: () => void;
  addParticipant: (conversationId: string, target: User) => Promise<void>;
  updateGroupInfo: (
    conversationId: string,
    input: { title?: string; avatarUrl?: string; description?: string | null }
  ) => Promise<void>;
  removeParticipant: (conversationId: string, userId: string) => Promise<void>;
  updateParticipantRole: (conversationId: string, userId: string, role: ParticipantRole) => Promise<void>;
  leaveGroup: (conversationId: string) => Promise<void>;
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
    if (MEDIA_TYPES.includes(replyTo.type)) {
      const meta = JSON.parse(plaintext) as MediaMeta;
      return { ...base, text: meta.caption ?? null };
    }
    return { ...base, text: plaintext };
  } catch {
    return { ...base, text: null };
  }
}

function decryptToMessage(conversationKey: string, message: Message): DecryptedMessage {
  const replyPreview = message.replyTo ? decryptReplyPreview(conversationKey, message.replyTo) : null;

  if (message.deletedAt) {
    return { ...message, text: null, meta: null, decryptFailed: false, replyPreview };
  }

  let plaintext: string;
  try {
    plaintext = decryptMessage(message.ciphertext, message.nonce, conversationKey);
  } catch {
    return { ...message, text: null, meta: null, decryptFailed: true, replyPreview };
  }

  if (MEDIA_TYPES.includes(message.type)) {
    try {
      const meta = JSON.parse(plaintext) as MediaMeta;
      return { ...message, text: meta.caption ?? null, meta, decryptFailed: false, replyPreview };
    } catch {
      return { ...message, text: null, meta: null, decryptFailed: true, replyPreview };
    }
  }

  return { ...message, text: plaintext, meta: null, decryptFailed: false, replyPreview };
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
  typingUsers: {},
  onlineUsers: new Set(),
  listenersRegistered: false,
  drafts: {},

  loadConversations: async () => {
    const conversations = await chatsApi.list();
    set({ conversations });
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

  sendTextMessage: async (conversationId, text, replyToId, mentions) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error("Suhbat topilmadi");

    const key = get().getConversationKey(conversation);
    const { ciphertext, nonce } = encryptMessage(text, key);

    const message = await chatsApi.sendMessage(conversationId, { type: "TEXT", ciphertext, nonce, replyToId, mentions });
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

  sendMediaMessage: async (conversationId, asset, type, replyToId) => {
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
    };
    const { ciphertext, nonce } = encryptMessage(JSON.stringify(meta), key);

    const message = await chatsApi.sendMessage(conversationId, { type, ciphertext, nonce, mediaUrl: url, replyToId });
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

  deleteMessage: async (conversationId, messageId) => {
    const updated = await chatsApi.deleteMessage(conversationId, messageId);
    set((state) => {
      const existing = state.messagesByConversation[conversationId] ?? [];
      return {
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: existing.map((m) => (m.id === messageId ? { ...m, ...updated, text: null, meta: null, decryptFailed: false } : m)),
        },
      };
    });
  },

  editMessage: async (conversationId, messageId, text, mentions) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error("Suhbat topilmadi");

    const key = get().getConversationKey(conversation);
    const { ciphertext, nonce } = encryptMessage(text, key);

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

  forwardMessage: async (sourceConversationId, messageId, targetConversationId) => {
    const sourceConversation = get().conversations.find((c) => c.id === sourceConversationId);
    const targetConversation = get().conversations.find((c) => c.id === targetConversationId);
    if (!sourceConversation || !targetConversation) throw new Error("Suhbat topilmadi");

    const message = (get().messagesByConversation[sourceConversationId] ?? []).find((m) => m.id === messageId);
    if (!message || message.deletedAt || message.decryptFailed) throw new Error("Xabarni yo'naltirib bo'lmadi");

    const sourceKey = get().getConversationKey(sourceConversation);
    const targetKey = get().getConversationKey(targetConversation);

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
      sentMessage = await chatsApi.sendMessage(targetConversationId, { type: message.type, ciphertext, nonce, mediaUrl: url });
    } else {
      const { ciphertext, nonce } = encryptMessage(message.text ?? "", targetKey);
      sentMessage = await chatsApi.sendMessage(targetConversationId, { type: "TEXT", ciphertext, nonce });
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

  markRead: async (conversationId) => {
    await chatsApi.markRead(conversationId);
    getSocket()?.emit("message:read", { conversationId });
  },

  togglePin: async (conversationId) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    const updated = await chatsApi.updatePreferences(conversationId, { isPinned: !conversation.isPinned });
    set((state) => ({
      conversations: upsertConversation(state.conversations, { ...conversation, ...updated }),
    }));
  },

  toggleMute: async (conversationId) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    const updated = await chatsApi.updatePreferences(conversationId, { isMuted: !conversation.isMuted });
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
        }),
      }));
    } else {
      const updated = await chatsApi.updatePreferences(conversationId, { markedUnread: true });
      set((state) => ({
        conversations: upsertConversation(state.conversations, { ...conversation, ...updated }),
      }));
    }
  },

  clearHistory: async (conversationId) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    await chatsApi.clearHistory(conversationId);
    set((state) => ({
      messagesByConversation: { ...state.messagesByConversation, [conversationId]: [] },
      hasMoreByConversation: { ...state.hasMoreByConversation, [conversationId]: false },
      conversations: upsertConversation(state.conversations, { ...conversation, lastMessage: null }),
    }));
  },

  setPinnedMessage: async (conversationId, messageId) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) return;
    const updated = await chatsApi.setPinnedMessage(conversationId, messageId);
    set((state) => ({
      conversations: upsertConversation(state.conversations, { ...conversation, ...updated }),
    }));
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

  leaveGroup: async (conversationId) => {
    await chatsApi.leave(conversationId);
    delete conversationKeyCache[conversationId];
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== conversationId),
      messagesByConversation: dropConversation(state.messagesByConversation, conversationId),
      hasMoreByConversation: dropConversation(state.hasMoreByConversation, conversationId),
    }));
  },

  setTyping: (conversationId, isTyping) => {
    getSocket()?.emit("typing", { conversationId, isTyping });
  },

  setupSocketListeners: () => {
    if (get().listenersRegistered) return;
    const socket = getSocket();
    if (!socket) return;

    socket.on("message:new", (message: Message) => {
      const conversation = get().conversations.find((c) => c.id === message.conversationId);
      if (!conversation) return;

      const key = get().getConversationKey(conversation);
      const decrypted = decryptToMessage(key, message);

      set((state) => {
        const existing = state.messagesByConversation[message.conversationId] ?? [];
        if (existing.some((m) => m.id === decrypted.id)) return state;
        return {
          messagesByConversation: {
            ...state.messagesByConversation,
            [message.conversationId]: [...existing, decrypted],
          },
          conversations: upsertConversation(state.conversations, {
            ...conversation,
            lastMessage: message,
            updatedAt: message.createdAt,
          }),
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
              m.id === message.id ? { ...m, ...message, text: null, meta: null, decryptFailed: false } : m
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
              isArchived: existing.isArchived,
              markedUnread: existing.markedUnread,
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

    socket.on("message:read", ({ conversationId, userId, at }: { conversationId: string; userId: string; at: string }) => {
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, participants: c.participants.map((p) => (p.userId === userId ? { ...p, lastReadAt: at } : p)) }
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
