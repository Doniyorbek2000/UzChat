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
import { Conversation, Message, User } from "../types";

export interface DecryptedMessage extends Message {
  text: string | null;
  decryptFailed: boolean;
}

interface ChatState {
  conversations: Conversation[];
  messagesByConversation: Record<string, DecryptedMessage[]>;
  typingUsers: Record<string, Set<string>>;
  listenersRegistered: boolean;

  loadConversations: () => Promise<void>;
  getConversationKey: (conversation: Conversation) => string;
  loadMessages: (conversationId: string) => Promise<void>;
  sendTextMessage: (conversationId: string, text: string) => Promise<void>;
  createDirectConversation: (target: User) => Promise<Conversation>;
  createGroupConversation: (title: string, members: User[]) => Promise<Conversation>;
  markRead: (conversationId: string) => Promise<void>;
  setTyping: (conversationId: string, isTyping: boolean) => void;
  setupSocketListeners: () => void;
}

const conversationKeyCache: Record<string, string> = {};

function decryptToMessage(conversationKey: string, message: Message): DecryptedMessage {
  if (message.type === "SYSTEM" || message.type === "AUDIO" || message.type === "IMAGE" || message.type === "VIDEO" || message.type === "FILE") {
    try {
      return { ...message, text: decryptMessage(message.ciphertext, message.nonce, conversationKey), decryptFailed: false };
    } catch {
      return { ...message, text: null, decryptFailed: true };
    }
  }
  try {
    return { ...message, text: decryptMessage(message.ciphertext, message.nonce, conversationKey), decryptFailed: false };
  } catch {
    return { ...message, text: null, decryptFailed: true };
  }
}

function upsertConversation(conversations: Conversation[], conversation: Conversation): Conversation[] {
  const filtered = conversations.filter((c) => c.id !== conversation.id);
  return [conversation, ...filtered];
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  messagesByConversation: {},
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
    const messages = await chatsApi.listMessages(conversationId);
    const decrypted = messages.map((m) => decryptToMessage(key, m));

    set((state) => ({
      messagesByConversation: { ...state.messagesByConversation, [conversationId]: decrypted },
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
