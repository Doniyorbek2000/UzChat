import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore, DecryptedMessage, decryptReplyPreview } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { useWallpaperStore } from "../../store/wallpaperStore";
import { getWallpaperColor } from "../../theme/wallpapers";
import { ConversationParticipant, MessageReaction, MessageType } from "../../types";
import { colors } from "../../theme/colors";
import { MediaImageBubble } from "../../components/MediaImageBubble";
import { MediaFileBubble } from "../../components/MediaFileBubble";
import { MediaAudioBubble } from "../../components/MediaAudioBubble";
import { ContactCardBubble } from "../../components/ContactCardBubble";
import { LinkPreviewCard } from "../../components/LinkPreviewCard";
import { extractFirstUrl } from "../../utils/linkPreview";
import { formatDuration } from "../../utils/mediaFile";
import { formatTime } from "../../utils/conversation";
import { DISAPPEARING_MESSAGE_OPTIONS, formatDisappearingDuration } from "../../utils/disappearingMessages";
import { setActiveConversationId } from "../../utils/pushNotifications";

type Props = NativeStackScreenProps<RootStackParamList, "ChatRoom">;

const RECALL_WINDOW_MS = 2 * 60 * 1000;

const REPLY_TYPE_LABELS: Partial<Record<MessageType, string>> = {
  IMAGE: "🖼 Rasm",
  VIDEO: "🎬 Video",
  AUDIO: "🎵 Ovozli xabar",
  FILE: "📄 Fayl",
  CONTACT: "👤 Kontakt",
};

function getPreviewLabel(item: { type: MessageType; text: string | null; deletedAt: string | null }) {
  if (item.deletedAt) return "🚫 Xabar o'chirildi";
  if (item.type === "TEXT") return item.text ?? "🔒 Xabarni ochib bo'lmadi";
  const label = REPLY_TYPE_LABELS[item.type] ?? "Xabar";
  return item.text ? `${label}: ${item.text}` : label;
}

function isMessageRead(message: { createdAt: string }, participant: ConversationParticipant) {
  return !!participant.lastReadAt && new Date(participant.lastReadAt) >= new Date(message.createdAt);
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function groupReactions(reactions: MessageReaction[]) {
  const groups = new Map<string, string[]>();
  for (const r of reactions) {
    const userIds = groups.get(r.emoji) ?? [];
    userIds.push(r.userId);
    groups.set(r.emoji, userIds);
  }
  return [...groups.entries()].map(([emoji, userIds]) => ({ emoji, userIds }));
}

const TOKEN_PATTERN = /(@[a-zA-Z0-9_]+|https?:\/\/[^\s<>"]+)/g;
const EVERYONE_MENTION = "@hammasi";

// WhatsApp-style inline formatting: *bold*, _italic_, ~strikethrough~, `code`.
// Each marker must hug non-space content so things like "5 * 3" are left alone.
const FORMAT_PATTERN =
  /(\*(?:[^\s*](?:[^*\n]*[^\s*])?)\*|_(?:[^\s_](?:[^_\n]*[^\s_])?)_|~(?:[^\s~](?:[^~\n]*[^\s~])?)~|`(?:[^\s`](?:[^`\n]*[^\s`])?)`)/g;

function renderFormattedSegment(text: string, keyPrefix: string) {
  const parts = text.split(FORMAT_PATTERN);
  return parts.map((part, i) => {
    if (i % 2 === 0) return part;
    const inner = part.slice(1, -1);
    const key = `${keyPrefix}-${i}`;
    switch (part[0]) {
      case "*":
        return (
          <Text key={key} style={styles.boldText}>
            {inner}
          </Text>
        );
      case "_":
        return (
          <Text key={key} style={styles.italicText}>
            {inner}
          </Text>
        );
      case "~":
        return (
          <Text key={key} style={styles.strikeText}>
            {inner}
          </Text>
        );
      default:
        return (
          <Text key={key} style={styles.codeText}>
            {inner}
          </Text>
        );
    }
  });
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query ? (
      <Text key={i} style={styles.searchHighlight}>
        {part}
      </Text>
    ) : (
      part
    )
  );
}

function renderMessageText(text: string, participants: ConversationParticipant[]) {
  const usernames = new Set(participants.map((p) => p.user.username));
  const parts = text.split(TOKEN_PATTERN);
  return (
    <Text style={styles.messageText}>
      {parts.map((part, i) => {
        if (part === EVERYONE_MENTION || (part.startsWith("@") && usernames.has(part.slice(1)))) {
          return (
            <Text key={i} style={styles.mentionText}>
              {part}
            </Text>
          );
        }
        if (/^https?:\/\//.test(part)) {
          return (
            <Text key={i} style={styles.linkText} onPress={() => Linking.openURL(part)}>
              {part}
            </Text>
          );
        }
        return renderFormattedSegment(part, `${i}`);
      })}
    </Text>
  );
}

export function ChatRoomScreen({ route, navigation }: Props) {
  const { conversationId, title } = route.params;
  const user = useAuthStore((s) => s.user);
  const contactAliases = useChatStore((s) => s.contactAliases);
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === conversationId));
  const messages = useChatStore((s) => s.messagesByConversation[conversationId] ?? []);
  const hasMore = useChatStore((s) => s.hasMoreByConversation[conversationId] ?? false);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const loadOlderMessages = useChatStore((s) => s.loadOlderMessages);
  const sendTextMessage = useChatStore((s) => s.sendTextMessage);
  const sendMediaMessage = useChatStore((s) => s.sendMediaMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const editMessage = useChatStore((s) => s.editMessage);
  const toggleReaction = useChatStore((s) => s.toggleReaction);
  const toggleStar = useChatStore((s) => s.toggleStar);
  const blockUser = useChatStore((s) => s.blockUser);
  const unblockUser = useChatStore((s) => s.unblockUser);
  const clearHistory = useChatStore((s) => s.clearHistory);
  const setPinnedMessage = useChatStore((s) => s.setPinnedMessage);
  const setDisappearingMessages = useChatStore((s) => s.setDisappearingMessages);
  const markRead = useChatStore((s) => s.markRead);
  const setTyping = useChatStore((s) => s.setTyping);
  const typingUsers = useChatStore((s) => s.typingUsers[conversationId]);
  const getConversationKey = useChatStore((s) => s.getConversationKey);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const loadDrafts = useChatStore((s) => s.loadDrafts);
  const setDraft = useChatStore((s) => s.setDraft);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recording, setRecording] = useState(false);
  const [replyingTo, setReplyingTo] = useState<DecryptedMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<DecryptedMessage | null>(null);
  const [actionMessage, setActionMessage] = useState<DecryptedMessage | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mentionPickerVisible, setMentionPickerVisible] = useState(false);
  const [pendingMentions, setPendingMentions] = useState<string[]>([]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const listRef = useRef<FlatList<DecryptedMessage>>(null);
  const wallpaperId = useWallpaperStore((s) => s.getWallpaperId(conversationId));
  const wallpaperColor = getWallpaperColor(wallpaperId);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const otherParticipant =
    conversation?.type === "DIRECT" ? conversation.participants.find((p) => p.userId !== user?.id) : null;
  const otherUser = otherParticipant?.user ?? null;
  const otherUserDisplayName = otherUser ? (contactAliases[otherUser.id] ?? otherUser.displayName) : "";
  const isOtherOnline = otherUser ? onlineUsers.has(otherUser.id) : false;
  const presenceLabel = otherUser
    ? isOtherOnline
      ? "Onlayn"
      : otherUser.lastSeenAt
        ? `Oxirgi marta: ${formatTime(otherUser.lastSeenAt)}`
        : ""
    : "";

  const onToggleBlock = () => {
    if (!otherUser) return;
    if (conversation?.isBlocked) {
      Alert.alert("Blokdan chiqarish", `${otherUserDisplayName} blokdan chiqarilsinmi?`, [
        { text: "Bekor qilish", style: "cancel" },
        { text: "Blokdan chiqarish", onPress: () => unblockUser(otherUser.id).catch(() => {}) },
      ]);
    } else {
      Alert.alert("Bloklash", `${otherUserDisplayName} bloklansinmi? U sizga xabar yubora olmaydi.`, [
        { text: "Bekor qilish", style: "cancel" },
        { text: "Bloklash", style: "destructive", onPress: () => blockUser(otherUser.id).catch(() => {}) },
      ]);
    }
  };

  const onClearHistory = () => {
    Alert.alert(
      "Suhbatni tozalash",
      "Barcha xabarlar faqat sizning ko'rinishingizdan o'chiriladi. Davom etilsinmi?",
      [
        { text: "Bekor qilish", style: "cancel" },
        { text: "Tozalash", style: "destructive", onPress: () => clearHistory(conversationId).catch(() => {}) },
      ]
    );
  };

  const onSetDisappearingMessages = () => {
    Alert.alert(
      "O'chiriladigan xabarlar",
      "Yangi xabarlar belgilangan vaqtdan so'ng avtomatik o'chiriladi",
      [
        ...DISAPPEARING_MESSAGE_OPTIONS.map((option) => ({
          text: option.label,
          onPress: () =>
            setDisappearingMessages(conversationId, option.value).catch(() => {
              Alert.alert("Xatolik", "Sozlamani o'zgartirib bo'lmadi");
            }),
        })),
        { text: "Bekor qilish", style: "cancel" as const },
      ]
    );
  };

  const onChatMenu = () => {
    if (!otherUser) return;
    Alert.alert(otherUserDisplayName, undefined, [
      { text: "🖼 Umumiy media", onPress: () => navigation.navigate("SharedMedia", { conversationId }) },
      { text: "🗑 Suhbatni tozalash", onPress: onClearHistory },
      {
        text: `⏳ O'chiriladigan xabarlar (${formatDisappearingDuration(conversation?.disappearingSeconds ?? null)})`,
        onPress: onSetDisappearingMessages,
      },
      {
        text: conversation?.isBlocked ? "Blokdan chiqarish" : "Bloklash",
        style: conversation?.isBlocked ? "default" : "destructive",
        onPress: onToggleBlock,
      },
      { text: "Bekor qilish", style: "cancel" },
    ]);
  };

  useEffect(() => {
    if (selectionMode) {
      const canBulkDelete = [...selectedIds].some((id) => {
        const m = messages.find((msg) => msg.id === id);
        return (
          m && m.senderId === user?.id && !m.deletedAt && Date.now() - new Date(m.createdAt).getTime() <= RECALL_WINDOW_MS
        );
      });
      navigation.setOptions({
        title: `${selectedIds.size} ta tanlandi`,
        headerTitle: undefined,
        headerLeft: () => (
          <TouchableOpacity onPress={exitSelectionMode} hitSlop={8}>
            <Text style={styles.headerInfoIcon}>✕</Text>
          </TouchableOpacity>
        ),
        headerRight: () => (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={onBulkForward} hitSlop={8}>
              <Text style={styles.headerInfoIcon}>➡️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onBulkStar()} hitSlop={8}>
              <Text style={styles.headerInfoIcon}>⭐</Text>
            </TouchableOpacity>
            {canBulkDelete && (
              <TouchableOpacity onPress={onBulkDelete} hitSlop={8}>
                <Text style={styles.headerInfoIcon}>🗑</Text>
              </TouchableOpacity>
            )}
          </View>
        ),
      });
      return;
    }

    navigation.setOptions({
      title,
      headerLeft: undefined,
      headerTitle: presenceLabel
        ? () => (
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitleText} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {presenceLabel}
              </Text>
            </View>
          )
        : undefined,
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setSearchVisible(true)} hitSlop={8}>
            <Text style={styles.headerInfoIcon}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("ChatWallpaper", { conversationId })} hitSlop={8}>
            <Text style={styles.headerInfoIcon}>🖼</Text>
          </TouchableOpacity>
          {conversation?.type === "GROUP" ? (
            <TouchableOpacity onPress={() => navigation.navigate("GroupInfo", { conversationId })} hitSlop={8}>
              <Text style={styles.headerInfoIcon}>ℹ️</Text>
            </TouchableOpacity>
          ) : conversation?.type === "DIRECT" && !conversation.isSelf ? (
            <TouchableOpacity onPress={onChatMenu} hitSlop={8}>
              <Text style={styles.headerInfoIcon}>⋮</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ),
    });
  }, [
    navigation,
    title,
    conversationId,
    conversation?.type,
    conversation?.isBlocked,
    presenceLabel,
    otherUser,
    selectionMode,
    selectedIds,
    messages,
    user?.id,
  ]);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      setActiveConversationId(conversationId);
      return () => setActiveConversationId(null);
    }, [conversationId])
  );

  useEffect(() => {
    loadMessages(conversationId)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [conversationId, loadMessages]);

  const textRef = useRef(text);
  useEffect(() => {
    textRef.current = text;
  }, [text]);

  const editingRef = useRef<DecryptedMessage | null>(null);
  useEffect(() => {
    editingRef.current = editingMessage;
  }, [editingMessage]);

  useEffect(() => {
    loadDrafts()
      .then(() => {
        const draft = useChatStore.getState().drafts[conversationId];
        if (draft) setText(draft);
      })
      .catch(() => {});

    return () => {
      if (!editingRef.current) {
        setDraft(conversationId, textRef.current).catch(() => {});
      }
    };
  }, [conversationId, loadDrafts, setDraft]);

  useEffect(() => {
    markRead(conversationId).catch(() => {});
  }, [conversationId, markRead, messages.length]);

  const conversationKey = conversation ? getConversationKey(conversation) : null;

  const scrollToLatest = () => listRef.current?.scrollToOffset({ offset: 0, animated: true });

  const getAuthorName = (senderId: string) => {
    if (senderId === user?.id) return "Siz";
    return contactAliases[senderId] ?? conversation?.participants.find((p) => p.userId === senderId)?.user.displayName ?? "";
  };

  const pinnedPreview =
    conversation?.pinnedMessage && conversationKey
      ? decryptReplyPreview(conversationKey, conversation.pinnedMessage)
      : null;

  const onUnpin = () => {
    Alert.alert("Qadalgan xabar", "Xabarni qadashdan olib tashlansinmi?", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "Olib tashlash", style: "destructive", onPress: () => setPinnedMessage(conversationId, null).catch(() => {}) },
    ]);
  };

  const trimmedSearchQuery = searchQuery.trim().toLowerCase();
  const searchResults = trimmedSearchQuery
    ? messages
        .filter(
          (m) =>
            m.type === "TEXT" &&
            !m.deletedAt &&
            !m.decryptFailed &&
            (m.text ?? "").toLowerCase().includes(trimmedSearchQuery)
        )
        .reverse()
    : [];

  const onLoadMoreSearchResults = async () => {
    if (searchLoadingMore || !hasMore) return;
    setSearchLoadingMore(true);
    await loadOlderMessages(conversationId).catch(() => {});
    setSearchLoadingMore(false);
  };

  const onSelectSearchResult = (message: DecryptedMessage) => {
    setSearchVisible(false);
    setSearchQuery("");
    const index = invertedData.findIndex((m) => m.id === message.id);
    if (index >= 0) {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.4 });
    }
    setHighlightedMessageId(message.id);
    setTimeout(() => setHighlightedMessageId((id) => (id === message.id ? null : id)), 1500);
  };

  const onSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const mentions = pendingMentions.filter((id) => {
      if (trimmed.includes(EVERYONE_MENTION)) return true;
      const username = conversation?.participants.find((p) => p.userId === id)?.user.username;
      return username && trimmed.includes(`@${username}`);
    });

    if (editingMessage) {
      const messageId = editingMessage.id;
      setText("");
      setEditingMessage(null);
      setPendingMentions([]);
      setTyping(conversationId, false);
      try {
        await editMessage(conversationId, messageId, trimmed, mentions.length > 0 ? mentions : undefined);
      } catch (err: any) {
        setText(trimmed);
        setEditingMessage(editingMessage);
        const message = err?.response?.data?.error?.message;
        if (message) Alert.alert("Xatolik", message);
      }
      return;
    }

    const replyToId = replyingTo?.id;
    setText("");
    setReplyingTo(null);
    setPendingMentions([]);
    setTyping(conversationId, false);
    try {
      await sendTextMessage(conversationId, trimmed, replyToId, mentions.length > 0 ? mentions : undefined);
      scrollToLatest();
    } catch (err: any) {
      setText(trimmed);
      const message = err?.response?.data?.error?.message;
      if (message) Alert.alert("Xatolik", message);
    }
  };

  const onEdit = (item: DecryptedMessage) => {
    setReplyingTo(null);
    setPendingMentions([...item.mentions]);
    setEditingMessage(item);
    setText(item.text ?? "");
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setPendingMentions([]);
    setText("");
  };

  const onMentionUser = (participant: ConversationParticipant) => {
    setText((prev) => {
      const needsSpace = prev.length > 0 && !/\s$/.test(prev);
      return `${prev}${needsSpace ? " " : ""}@${participant.user.username} `;
    });
    setPendingMentions((prev) => (prev.includes(participant.userId) ? prev : [...prev, participant.userId]));
    setMentionPickerVisible(false);
  };

  const onMentionEveryone = () => {
    setText((prev) => {
      const needsSpace = prev.length > 0 && !/\s$/.test(prev);
      return `${prev}${needsSpace ? " " : ""}${EVERYONE_MENTION} `;
    });
    const everyoneIds = (conversation?.participants ?? [])
      .map((p) => p.userId)
      .filter((id) => id !== user?.id);
    setPendingMentions((prev) => Array.from(new Set([...prev, ...everyoneIds])));
    setMentionPickerVisible(false);
  };

  const onChangeText = (value: string) => {
    setText(value);
    setTyping(conversationId, value.length > 0);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Ruxsat kerak", "Rasm yuborish uchun galereyaga ruxsat bering");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    setSending(true);
    try {
      await sendMediaMessage(
        conversationId,
        {
          uri: asset.uri,
          name: asset.fileName ?? `photo-${Date.now()}.jpg`,
          mimeType: asset.mimeType ?? "image/jpeg",
          width: asset.width,
          height: asset.height,
        },
        "IMAGE",
        replyToId
      );
      scrollToLatest();
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Rasmni yuborib bo'lmadi");
    } finally {
      setSending(false);
    }
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    setSending(true);
    try {
      await sendMediaMessage(
        conversationId,
        {
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType ?? "application/octet-stream",
        },
        "FILE",
        replyToId
      );
      scrollToLatest();
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Faylni yuborib bo'lmadi");
    } finally {
      setSending(false);
    }
  };

  const onAttach = () => {
    Alert.alert("Yuborish", "Nimani yubormoqchisiz?", [
      { text: "🖼 Rasm", onPress: pickImage },
      { text: "📄 Fayl", onPress: pickFile },
      { text: "👤 Kontakt", onPress: () => navigation.navigate("ShareContact", { conversationId }) },
      { text: "Bekor qilish", style: "cancel" },
    ]);
  };

  const startRecording = async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Ruxsat kerak", "Ovozli xabar yuborish uchun mikrofonga ruxsat bering");
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setRecording(true);
  };

  const cancelRecording = async () => {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    setRecording(false);
  };

  const sendRecording = async () => {
    const durationMs = recorderState.durationMillis;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    setRecording(false);

    const uri = recorder.uri;
    if (!uri || durationMs < 1000) return;

    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    setSending(true);
    try {
      await sendMediaMessage(
        conversationId,
        { uri, name: `voice-${Date.now()}.m4a`, mimeType: "audio/m4a", duration: Math.round(durationMs / 1000) },
        "AUDIO",
        replyToId
      );
      scrollToLatest();
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Ovozli xabarni yuborib bo'lmadi");
    } finally {
      setSending(false);
    }
  };

  const onDelete = (item: DecryptedMessage) => {
    Alert.alert("Xabarni o'chirish", "Bu xabar barcha ishtirokchilardan o'chiriladi", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "O'chirish", style: "destructive", onPress: () => deleteMessage(conversationId, item.id) },
    ]);
  };

  const onLongPress = (item: DecryptedMessage) => {
    if (item.deletedAt) return;
    if (selectionMode) return;
    setActionMessage(item);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const enterSelectionMode = (messageId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([messageId]));
  };

  const toggleSelected = (messageId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  };

  const onPressMessage = (item: DecryptedMessage) => {
    if (!selectionMode || item.deletedAt) return;
    toggleSelected(item.id);
  };

  const onBulkForward = () => {
    const ids = [...selectedIds].filter((id) => {
      const message = messages.find((m) => m.id === id);
      return message && !message.deletedAt && !message.decryptFailed;
    });
    if (ids.length === 0) return;
    exitSelectionMode();
    navigation.navigate("ForwardMessage", { conversationId, messageIds: ids });
  };

  const onBulkStar = async () => {
    const items = messages.filter((m) => selectedIds.has(m.id) && !m.deletedAt);
    if (items.length === 0) return;
    const allStarred = items.every((m) => m.isStarred);
    for (const item of items) {
      if (item.isStarred === allStarred) {
        await toggleStar(conversationId, item.id).catch(() => {});
      }
    }
    exitSelectionMode();
  };

  const onBulkDelete = () => {
    const eligible = messages.filter(
      (m) =>
        selectedIds.has(m.id) &&
        m.senderId === user?.id &&
        !m.deletedAt &&
        Date.now() - new Date(m.createdAt).getTime() <= RECALL_WINDOW_MS
    );
    if (eligible.length === 0) return;
    Alert.alert("Tanlangan xabarlarni o'chirish", `${eligible.length} ta xabar barcha ishtirokchilardan o'chiriladi`, [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          for (const item of eligible) {
            await deleteMessage(conversationId, item.id).catch(() => {});
          }
          exitSelectionMode();
        },
      },
    ]);
  };

  const onEndReached = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadOlderMessages(conversationId).catch(() => {});
    setLoadingMore(false);
  };

  const isGroup = conversation?.type === "GROUP";
  const myRole = conversation?.participants.find((p) => p.userId === user?.id)?.role;
  const canSend = !isGroup || !conversation?.onlyAdminsCanSend || myRole === "OWNER" || myRole === "ADMIN";

  const renderItem = ({ item }: { item: DecryptedMessage }) => {
    const isOwn = item.senderId === user?.id;
    const sender = conversation?.participants.find((p) => p.userId === item.senderId)?.user;

    let content;
    if (item.deletedAt) {
      content = <Text style={styles.deletedText}>🚫 Xabar o'chirildi</Text>;
    } else if (item.decryptFailed) {
      content = <Text style={styles.messageText}>🔒 Xabarni ochib bo'lmadi</Text>;
    } else if (item.type === "IMAGE" && conversationKey) {
      content = <MediaImageBubble message={item} conversationKey={conversationKey} />;
    } else if (item.type === "AUDIO" && conversationKey) {
      content = <MediaAudioBubble message={item} conversationKey={conversationKey} />;
    } else if ((item.type === "FILE" || item.type === "VIDEO") && conversationKey) {
      content = <MediaFileBubble message={item} conversationKey={conversationKey} />;
    } else if (item.type === "CONTACT") {
      content = <ContactCardBubble message={item} navigation={navigation} />;
    } else {
      content = renderMessageText(item.text ?? "", conversation?.participants ?? []);
    }

    const linkUrl =
      !item.deletedAt && !item.decryptFailed && item.type === "TEXT" ? extractFirstUrl(item.text ?? "") : null;

    const selected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onPressMessage(item)}
        onLongPress={() => onLongPress(item)}
        style={[styles.bubbleRow, isOwn ? styles.bubbleRowSelf : styles.bubbleRowOther]}
      >
        {selectionMode && !item.deletedAt && (
          <View style={[styles.selectCheckbox, selected && styles.selectCheckboxSelected]}>
            {selected && <Text style={styles.selectCheckmark}>✓</Text>}
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isOwn ? styles.bubbleSelf : styles.bubbleOther,
            item.deletedAt && styles.bubbleDeleted,
            item.id === highlightedMessageId && styles.bubbleHighlighted,
          ]}
        >
          {isGroup && !isOwn && sender && (
            <Text style={styles.senderName}>{contactAliases[sender.id] ?? sender.displayName}</Text>
          )}
          {item.forwardedFromName && !item.deletedAt && (
            <Text style={styles.forwardedLabel}>↪ Yo'naltirilgan: {item.forwardedFromName}</Text>
          )}
          {item.replyPreview && (
            <View style={styles.replyBox}>
              <View style={styles.replyBar} />
              <View style={styles.replyContent}>
                <Text style={styles.replyAuthor} numberOfLines={1}>
                  {getAuthorName(item.replyPreview.senderId)}
                </Text>
                <Text style={styles.replyText} numberOfLines={1}>
                  {getPreviewLabel(item.replyPreview)}
                </Text>
              </View>
            </View>
          )}
          {content}
          {linkUrl && <LinkPreviewCard url={linkUrl} />}
          {!item.deletedAt && item.reactions.length > 0 && (
            <View style={styles.reactionsRow}>
              {groupReactions(item.reactions).map(({ emoji, userIds }) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.reactionBadge, userIds.includes(user!.id) && styles.reactionBadgeActive]}
                  onPress={() => toggleReaction(conversationId, item.id, emoji).catch(() => {})}
                >
                  <Text style={styles.reactionBadgeText}>
                    {emoji} {userIds.length}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.messageFooter}>
            {item.editedAt && !item.deletedAt && <Text style={styles.editedLabel}>tahrirlangan</Text>}
            {item.isStarred && <Text style={styles.starIcon}>⭐</Text>}
            <Text style={styles.messageTime}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
            {isOwn && otherParticipant && (
              <Text style={[styles.receipt, isMessageRead(item, otherParticipant) && styles.receiptRead]}>
                {isMessageRead(item, otherParticipant) ? "✓✓" : "✓"}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const typingCount = typingUsers?.size ?? 0;
  const invertedData = [...messages].reverse();

  return (
    <>
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: wallpaperColor }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {pinnedPreview && (
        <TouchableOpacity style={styles.pinnedBar} onPress={onUnpin}>
          <Text style={styles.pinnedIcon}>📌</Text>
          <View style={styles.replyContent}>
            <Text style={styles.replyAuthor} numberOfLines={1}>
              {getAuthorName(pinnedPreview.senderId)}
            </Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {getPreviewLabel(pinnedPreview)}
            </Text>
          </View>
          <Text style={styles.pinnedClose}>✕</Text>
        </TouchableOpacity>
      )}
      <FlatList
        ref={listRef}
        data={invertedData}
        inverted
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onEndReachedThreshold={0.3}
        onEndReached={onEndReached}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.4 }), 200);
        }}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.loadingMore} color={colors.primary} /> : null}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>🔒 Xabarlar end-to-end shifrlangan</Text>
            </View>
          ) : null
        }
      />
      {typingCount > 0 && <Text style={styles.typing}>yozmoqda...</Text>}
      {editingMessage && (
        <View style={styles.replyPreviewBar}>
          <View style={styles.replyBar} />
          <View style={styles.replyContent}>
            <Text style={styles.replyAuthor} numberOfLines={1}>
              ✏️ Xabarni tahrirlash
            </Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {getPreviewLabel(editingMessage)}
            </Text>
          </View>
          <TouchableOpacity onPress={cancelEditing} hitSlop={8}>
            <Text style={styles.replyPreviewClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      {replyingTo && (
        <View style={styles.replyPreviewBar}>
          <View style={styles.replyBar} />
          <View style={styles.replyContent}>
            <Text style={styles.replyAuthor} numberOfLines={1}>
              {getAuthorName(replyingTo.senderId)}
            </Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {getPreviewLabel(replyingTo)}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={8}>
            <Text style={styles.replyPreviewClose}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      {conversation?.isBlocked ? (
        <View style={styles.blockedBar}>
          <Text style={styles.blockedText}>🚫 Siz bu foydalanuvchini bloklagansiz</Text>
          <TouchableOpacity onPress={onToggleBlock}>
            <Text style={styles.blockedAction}>Blokdan chiqarish</Text>
          </TouchableOpacity>
        </View>
      ) : !canSend ? (
        <View style={styles.blockedBar}>
          <Text style={styles.blockedText}>🔇 Faqat guruh egasi va adminlar xabar yubora oladi</Text>
        </View>
      ) : recording ? (
        <View style={styles.recordingRow}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingTime}>{formatDuration(recorderState.durationMillis / 1000)}</Text>
          <Text style={styles.recordingHint}>Ovoz yozilmoqda...</Text>
          <TouchableOpacity style={styles.recordingCancel} onPress={cancelRecording}>
            <Text style={styles.recordingCancelText}>Bekor qilish</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sendButton} onPress={sendRecording}>
            <Text style={styles.sendText}>Yuborish</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.attachButton} onPress={onAttach} disabled={sending || !!editingMessage}>
            {sending ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.attachIcon}>+</Text>}
          </TouchableOpacity>
          {isGroup && (
            <TouchableOpacity style={styles.attachButton} onPress={() => setMentionPickerVisible(true)} disabled={sending}>
              <Text style={styles.attachIcon}>@</Text>
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={onChangeText}
            placeholder="Xabar yozing..."
            multiline
          />
          {text.trim() ? (
            <TouchableOpacity style={styles.sendButton} onPress={onSend}>
              <Text style={styles.sendText}>Yuborish</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.attachButton} onPress={startRecording} disabled={sending || !!editingMessage}>
              <Text style={styles.attachIcon}>🎤</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </KeyboardAvoidingView>
    <Modal visible={!!actionMessage} transparent animationType="fade" onRequestClose={() => setActionMessage(null)}>
      <Pressable style={styles.actionBackdrop} onPress={() => setActionMessage(null)}>
        <Pressable style={styles.actionSheet}>
          <View style={styles.reactionPickerRow}>
            {QUICK_REACTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionPickerOption}
                onPress={() => {
                  if (actionMessage) toggleReaction(conversationId, actionMessage.id, emoji).catch(() => {});
                  setActionMessage(null);
                }}
              >
                <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              if (actionMessage) {
                setEditingMessage(null);
                setReplyingTo(actionMessage);
              }
              setActionMessage(null);
            }}
          >
            <Text style={styles.actionButtonText}>↩️ Javob berish</Text>
          </TouchableOpacity>
          {actionMessage && !actionMessage.deletedAt && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                if (actionMessage) enterSelectionMode(actionMessage.id);
                setActionMessage(null);
              }}
            >
              <Text style={styles.actionButtonText}>☑️ Tanlash</Text>
            </TouchableOpacity>
          )}
          {actionMessage &&
            actionMessage.type === "TEXT" &&
            !actionMessage.decryptFailed &&
            !actionMessage.deletedAt &&
            !!actionMessage.text && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  Clipboard.setStringAsync(actionMessage.text ?? "").catch(() => {});
                  setActionMessage(null);
                }}
              >
                <Text style={styles.actionButtonText}>📋 Nusxalash</Text>
              </TouchableOpacity>
            )}
          {actionMessage &&
            actionMessage.senderId === user?.id &&
            actionMessage.type === "TEXT" &&
            !actionMessage.decryptFailed &&
            Date.now() - new Date(actionMessage.createdAt).getTime() <= RECALL_WINDOW_MS && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  const message = actionMessage;
                  setActionMessage(null);
                  onEdit(message);
                }}
              >
                <Text style={styles.actionButtonText}>✏️ Tahrirlash</Text>
              </TouchableOpacity>
            )}
          {actionMessage && !actionMessage.deletedAt && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                const message = actionMessage;
                setActionMessage(null);
                toggleStar(conversationId, message.id).catch(() => {});
              }}
            >
              <Text style={styles.actionButtonText}>
                {actionMessage.isStarred ? "⭐ Saqlashni bekor qilish" : "⭐ Saqlash"}
              </Text>
            </TouchableOpacity>
          )}
          {actionMessage && !actionMessage.deletedAt && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                const message = actionMessage;
                setActionMessage(null);
                const isPinned = conversation?.pinnedMessage?.id === message.id;
                setPinnedMessage(conversationId, isPinned ? null : message.id).catch(() => {});
              }}
            >
              <Text style={styles.actionButtonText}>
                {conversation?.pinnedMessage?.id === actionMessage.id ? "📌 Qadashni bekor qilish" : "📌 Qadash"}
              </Text>
            </TouchableOpacity>
          )}
          {actionMessage && !actionMessage.decryptFailed && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                navigation.navigate("ForwardMessage", { conversationId, messageIds: [actionMessage.id] });
                setActionMessage(null);
              }}
            >
              <Text style={styles.actionButtonText}>➡️ Yo'naltirish</Text>
            </TouchableOpacity>
          )}
          {actionMessage &&
            actionMessage.senderId === user?.id &&
            Date.now() - new Date(actionMessage.createdAt).getTime() <= RECALL_WINDOW_MS && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  const message = actionMessage;
                  setActionMessage(null);
                  onDelete(message);
                }}
              >
                <Text style={[styles.actionButtonText, styles.actionButtonDanger]}>🗑 O'chirish</Text>
              </TouchableOpacity>
            )}
          <TouchableOpacity style={styles.actionButton} onPress={() => setActionMessage(null)}>
            <Text style={styles.actionButtonText}>Bekor qilish</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
    <Modal
      visible={mentionPickerVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setMentionPickerVisible(false)}
    >
      <Pressable style={styles.actionBackdrop} onPress={() => setMentionPickerVisible(false)}>
        <Pressable style={styles.actionSheet}>
          <Text style={styles.mentionPickerTitle}>Kimnidir eslatish</Text>
          <TouchableOpacity style={styles.actionButton} onPress={onMentionEveryone}>
            <Text style={styles.actionButtonText}>
              <Text style={styles.mentionText}>{EVERYONE_MENTION}</Text> (barcha a'zolar)
            </Text>
          </TouchableOpacity>
          {conversation?.participants
            .filter((p) => p.userId !== user?.id)
            .map((p) => (
              <TouchableOpacity key={p.userId} style={styles.actionButton} onPress={() => onMentionUser(p)}>
                <Text style={styles.actionButtonText}>
                  {contactAliases[p.userId] ?? p.user.displayName}{" "}
                  <Text style={styles.mentionText}>@{p.user.username}</Text>
                </Text>
              </TouchableOpacity>
            ))}
          <TouchableOpacity style={styles.actionButton} onPress={() => setMentionPickerVisible(false)}>
            <Text style={styles.actionButtonText}>Bekor qilish</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
    <Modal
      visible={searchVisible}
      animationType="slide"
      onRequestClose={() => setSearchVisible(false)}
    >
      <View style={styles.searchContainer}>
        <View style={styles.searchHeader}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Xabarlarni qidirish"
            placeholderTextColor={colors.textSecondary}
            autoFocus
            returnKeyType="search"
          />
          <TouchableOpacity
            onPress={() => {
              setSearchVisible(false);
              setSearchQuery("");
            }}
            hitSlop={8}
          >
            <Text style={styles.searchClose}>Yopish</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.searchResult} onPress={() => onSelectSearchResult(item)}>
              {isGroup && (
                <Text style={styles.searchResultAuthor} numberOfLines={1}>
                  {getAuthorName(item.senderId)}
                </Text>
              )}
              <Text style={styles.searchResultText} numberOfLines={2}>
                {highlightMatch(item.text ?? "", trimmedSearchQuery)}
              </Text>
              <Text style={styles.searchResultTime}>{formatTime(item.createdAt)}</Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.searchSeparator} />}
          ListFooterComponent={
            trimmedSearchQuery && searchResults.length === 0 && hasMore ? (
              <TouchableOpacity style={styles.searchLoadMore} onPress={onLoadMoreSearchResults} disabled={searchLoadingMore}>
                {searchLoadingMore ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={styles.searchLoadMoreText}>Eski xabarlarni qidirish</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            trimmedSearchQuery ? (
              <View style={styles.searchEmpty}>
                <Text style={styles.emptyText}>Hech narsa topilmadi</Text>
              </View>
            ) : null
          }
        />
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 12, flexGrow: 1 },
  loadingMore: { marginVertical: 12 },
  bubbleRow: { flexDirection: "row", marginVertical: 4, alignItems: "center" },
  bubbleRowSelf: { justifyContent: "flex-end" },
  bubbleRowOther: { justifyContent: "flex-start" },
  selectCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  selectCheckboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectCheckmark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  bubble: { maxWidth: "78%", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleSelf: { backgroundColor: colors.bubbleSelf, borderTopRightRadius: 2 },
  bubbleOther: { backgroundColor: colors.bubbleOther, borderTopLeftRadius: 2 },
  bubbleDeleted: { opacity: 0.6 },
  bubbleHighlighted: { borderWidth: 2, borderColor: colors.primary },
  senderName: { fontSize: 12, fontWeight: "600", color: colors.primaryDark, marginBottom: 2 },
  forwardedLabel: { fontSize: 11, color: colors.textSecondary, fontStyle: "italic", marginBottom: 2 },
  replyBox: { flexDirection: "row", marginBottom: 6, opacity: 0.85 },
  replyBar: { width: 3, borderRadius: 2, backgroundColor: colors.primary, marginRight: 6 },
  replyContent: { flex: 1 },
  replyAuthor: { fontSize: 12, fontWeight: "600", color: colors.primary },
  replyText: { fontSize: 13, color: colors.textSecondary },
  replyPreviewBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  replyPreviewClose: { fontSize: 16, color: colors.textSecondary, paddingHorizontal: 4 },
  pinnedBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  pinnedIcon: { fontSize: 14 },
  pinnedClose: { fontSize: 16, color: colors.textSecondary, paddingHorizontal: 4 },
  messageText: { fontSize: 16, color: colors.text },
  mentionText: { color: colors.primary, fontWeight: "600" },
  linkText: { color: colors.primary, textDecorationLine: "underline" },
  boldText: { fontWeight: "700" },
  italicText: { fontStyle: "italic" },
  strikeText: { textDecorationLine: "line-through" },
  codeText: {
    fontFamily: Platform.select({ ios: "Courier", android: "monospace", default: "monospace" }),
    backgroundColor: colors.border,
    borderRadius: 3,
    paddingHorizontal: 3,
  },
  mentionPickerTitle: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 },
  deletedText: { fontSize: 14, color: colors.textSecondary, fontStyle: "italic" },
  messageFooter: { flexDirection: "row", alignSelf: "flex-end", alignItems: "center", marginTop: 4, gap: 4 },
  messageTime: { fontSize: 10, color: colors.textSecondary },
  editedLabel: { fontSize: 10, color: colors.textSecondary, fontStyle: "italic" },
  starIcon: { fontSize: 10 },
  receipt: { fontSize: 11, color: colors.textSecondary },
  receiptRead: { color: colors.primary },
  reactionsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6, gap: 6 },
  reactionBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reactionBadgeActive: { borderColor: colors.primary, backgroundColor: colors.surface },
  reactionBadgeText: { fontSize: 12, color: colors.text },
  actionBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  actionSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  reactionPickerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 16,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  reactionPickerOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  reactionPickerEmoji: { fontSize: 26 },
  actionButton: { paddingVertical: 14, alignItems: "center" },
  actionButtonText: { fontSize: 16, color: colors.text },
  actionButtonDanger: { color: colors.danger },
  headerInfoIcon: { fontSize: 20, marginRight: 12 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  headerTitleContainer: { alignItems: "center" },
  headerTitleText: { fontSize: 17, fontWeight: "600", color: colors.text },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary },
  typing: { paddingHorizontal: 16, paddingBottom: 4, color: colors.textSecondary, fontSize: 12 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  recordingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  blockedBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  blockedText: { flex: 1, fontSize: 13, color: colors.textSecondary },
  blockedAction: { fontSize: 13, fontWeight: "600", color: colors.primary },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  recordingTime: { fontSize: 14, fontWeight: "600", color: colors.text, fontVariant: ["tabular-nums"] },
  recordingHint: { flex: 1, fontSize: 13, color: colors.textSecondary },
  recordingCancel: { paddingHorizontal: 12, paddingVertical: 10 },
  recordingCancelText: { color: colors.danger, fontWeight: "600" },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  attachIcon: { fontSize: 24, color: colors.primary, lineHeight: 26 },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 16,
  },
  sendButton: { backgroundColor: colors.primary, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  sendText: { color: "#fff", fontWeight: "600" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48, transform: [{ scaleY: -1 }] },
  emptyText: { color: colors.textSecondary },
  searchContainer: { flex: 1, backgroundColor: colors.background },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  searchClose: { color: colors.primary, fontWeight: "600", fontSize: 15 },
  searchResult: { paddingHorizontal: 16, paddingVertical: 12 },
  searchResultAuthor: { fontSize: 12, color: colors.primary, fontWeight: "600", marginBottom: 2 },
  searchResultText: { fontSize: 15, color: colors.text },
  searchResultTime: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  searchHighlight: { backgroundColor: colors.primary, color: "#fff", fontWeight: "700" },
  searchSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  searchLoadMore: { padding: 16, alignItems: "center" },
  searchLoadMoreText: { color: colors.primary, fontWeight: "600" },
  searchEmpty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48 },
});
