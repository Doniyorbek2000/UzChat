import { create } from "zustand";
import { chatsApi } from "../api/chats";
import { getSocket } from "../socket/socket";
import { useAuthStore } from "./authStore";
import {
  decryptMessage,
  encryptMessage,
  generateConversationKey,
  unwrapConversationKey,
  wrapConversationKey,
} from "../crypto/e2ee";
import { encryptAndUploadFile } from "../utils/mediaFile";
import { Conversation, Message, MediaAsset, MediaMeta, MessageType, User } from "../types";

export interface DecryptedMessage extends Message {
  text: string | null;
  meta: MediaMeta | null;
  decryptFailed: boolean;
}

const MEDIA_TYPES: MessageType[] = ["IMAGE", "VIDEO", "AUDIO", "FILE"];
const PAGE_SIZE = 30;

interface ChatState {
  conversations: Conversation[];
  messagesByConversation: Record<string, DecryptedMessage[]>;
  hasMoreByConversation: Record<string, boolean>;
  typingUsers: Record<string, Set<string>>;
  listenersRegistered: boolean;

  loadConversations: () => Promise<void>;
  getConversationKey: (conversation: Conversation) => string;
  loadMessages: (conversationId: string) => Promise<void>;
  loadOlderMessages: (conversationId: string) => Promise<void>;
  sendTextMessage: (conversationId: string, text: string) => Promise<void>;
  sendMediaMessage: (conversationId: string, asset: MediaAsset, type: MessageType) => Promise<void>;
  deleteMessage: (conversationId: string, messageId: string) => Promise<void>;
  createDirectConversation: (target: User) => Promise<Conversation>;
  createGroupConversation: (title: string, members: User[]) => Promise<Conversation>;
  markRead: (conversationId: string) => Promise<void>;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  setupSocketListeners: () => void;
}

const conversationKeyCache: Record<string, string> = {};

function decryptToMessage(conversationKey: string, message: Message): DecryptedMessage {
  if (message.deletedAt) {
    return { ...message, text: null, meta: null, decryptFailed: false };
  }

  let plaintext: string;
  try {
    plaintext = decryptMessage(message.ciphertext, message.nonce, conversationKey);
  } catch {
    return { ...message, text: null, meta: null, decryptFailed: true };
  }

  if (MEDIA_TYPES.includes(message.type)) {
    try {
      const meta = JSON.parse(plaintext) as MediaMeta;
      return { ...message, text: meta.caption ?? null, meta, decryptFailed: false };
    } catch {
      return { ...message, text: null, meta: null, decryptFailed: true };
    }
  }

  return { ...message, text: plaintext, meta: null, decryptFailed: false };
}

function upsertConversation(conversations: Conversation[], conversation: Conversation): Conversation[] {
  const filtered = conversations.filter((c) => c.id !== conversation.id);
  return [conversation, ...filtered];
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messagesByConversation: {},
  hasMoreByConversation: {},
  typingUsers: {},
  listenersRegistered: false,

  loadConversations: async () => {
    const conversations = await chatsApi.list();
    set({ conversations });
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

  sendTextMessage: async (conversationId, text) => {
    const conversation = get().conversations.find((c) => c.id === conversationId);
    if (!conversation) throw new Error("Suhbat topilmadi");

    const key = get().getConversationKey(conversation);
    const { ciphertext, nonce } = encryptMessage(text, key);

    const message = await chatsApi.sendMessage(conversationId, { type: "TEXT", ciphertext, nonce });
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

  sendMediaMessage: async (conversationId, asset, type) => {
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

    const message = await chatsApi.sendMessage(conversationId, { type, ciphertext, nonce, mediaUrl: url });
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

    socket.on("conversation:new", (conversation: Conversation) => {
      set((state) => ({ conversations: upsertConversation(state.conversations, conversation) }));
    });

    socket.on("conversation:updated", (conversation: Conversation) => {
      set((state) => ({ conversations: upsertConversation(state.conversations, conversation) }));
    });

    socket.on("typing", ({ conversationId, userId, isTyping }: { conversationId: string; userId: string; isTyping: boolean }) => {
      set((state) => {
        const current = new Set(state.typingUsers[conversationId] ?? []);
        if (isTyping) current.add(userId);
        else current.delete(userId);
        return { typingUsers: { ...state.typingUsers, [conversationId]: current } };
      });
    });

    set({ listenersRegistered: true });
  },
}));
