import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
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
  Switch,
  Image,
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
import { useChatSettingsStore } from "../../store/chatSettingsStore";
import { useRecentEmojiStore } from "../../store/recentEmojiStore";
import { getWallpaperColor } from "../../theme/wallpapers";
import { ConversationParticipant, MessageReaction, MessageType, ReportReason } from "../../types";
import { colors } from "../../theme/colors";
import { MediaImageBubble } from "../../components/MediaImageBubble";
import { ViewOnceImageBubble } from "../../components/ViewOnceImageBubble";
import { MediaFileBubble } from "../../components/MediaFileBubble";
import { MediaAudioBubble } from "../../components/MediaAudioBubble";
import { ContactCardBubble } from "../../components/ContactCardBubble";
import { PollBubble } from "../../components/PollBubble";
import { Avatar } from "../../components/Avatar";
import { LinkPreviewCard } from "../../components/LinkPreviewCard";
import { extractFirstUrl } from "../../utils/linkPreview";
import { formatDuration } from "../../utils/mediaFile";
import { formatTime } from "../../utils/conversation";
import { DISAPPEARING_MESSAGE_OPTIONS, formatDisappearingDuration } from "../../utils/disappearingMessages";
import { SCHEDULE_OPTIONS } from "../../utils/scheduledMessages";
import { setActiveConversationId } from "../../utils/pushNotifications";
import { exportConversation } from "../../utils/chatExport";
import { reportsApi } from "../../api/reports";

type Props = NativeStackScreenProps<RootStackParamList, "ChatRoom">;

const RECALL_WINDOW_MS = 2 * 60 * 1000;

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Tazyiq/bezovta qilish" },
  { value: "VIOLENCE", label: "Zo'ravonlik" },
  { value: "ILLEGAL_CONTENT", label: "Noqonuniy kontent" },
  { value: "IMPERSONATION", label: "Soxta profil" },
  { value: "OTHER", label: "Boshqa" },
];

const REPLY_TYPE_LABELS: Partial<Record<MessageType, string>> = {
  IMAGE: "🖼 Rasm",
  VIDEO: "🎬 Video",
  AUDIO: "🎵 Ovozli xabar",
  FILE: "📄 Fayl",
  CONTACT: "👤 Kontakt",
  POLL: "📊 So'rovnoma",
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

// Matches 1-3 emoji "clusters" (a base emoji optionally followed by a variation selector,
// skin-tone modifier, or ZWJ-joined emoji like family/profession emoji) and nothing else.
const EMOJI_ONLY_PATTERN =
  /^(?:\p{Extended_Pictographic}(?:️|[\u{1F3FB}-\u{1F3FF}]|‍\p{Extended_Pictographic}️?)*){1,3}$/u;

// WeChat/Telegram-style "stickers": a message containing only 1-3 emoji renders large, without a bubble.
function isEmojiOnlyMessage(text: string): boolean {
  const stripped = text.replace(/\s+/g, "");
  return stripped.length > 0 && stripped.length <= 30 && EMOJI_ONLY_PATTERN.test(stripped);
}

const MORE_REACTIONS = [
  "👎",
  "🔥",
  "🥰",
  "👏",
  "🤔",
  "🤯",
  "😱",
  "🤬",
  "🎉",
  "🤩",
  "🤮",
  "💩",
  "👌",
  "🤡",
  "🥱",
  "🥴",
  "😍",
  "💯",
  "🤣",
  "🍌",
  "🏆",
  "💔",
  "🤨",
  "😐",
  "🍓",
  "💋",
  "🙈",
  "😇",
  "🤝",
  "🤗",
  "🎅",
  "💅",
  "🆒",
  "👀",
  "😴",
];

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

// WhatsApp/Telegram-style inline formatting: *bold*, _italic_, ~strikethrough~, `code`, ||spoiler||.
// Each marker must hug non-space content so things like "5 * 3" are left alone.
const FORMAT_PATTERN =
  /(\*(?:[^\s*](?:[^*\n]*[^\s*])?)\*|_(?:[^\s_](?:[^_\n]*[^\s_])?)_|~(?:[^\s~](?:[^~\n]*[^\s~])?)~|`(?:[^\s`](?:[^`\n]*[^\s`])?)`|\|\|(?:[^\s|](?:[^|\n]*[^\s|])?)\|\|)/g;

function SpoilerText({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <Text onPress={() => setRevealed(true)} style={revealed ? undefined : styles.spoilerHidden}>
      {text}
    </Text>
  );
}

function renderFormattedSegment(text: string, keyPrefix: string) {
  const parts = text.split(FORMAT_PATTERN);
  return parts.map((part, i) => {
    if (i % 2 === 0) return part;
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("||") && part.endsWith("||")) {
      return <SpoilerText key={key} text={part.slice(2, -2)} />;
    }
    const inner = part.slice(1, -1);
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

function renderMessageText(text: string, participants: ConversationParticipant[], fontScale = 1) {
  const usernames = new Set(participants.map((p) => p.user.username));
  const parts = text.split(TOKEN_PATTERN);
  return (
    <Text style={[styles.messageText, { fontSize: 16 * fontScale }]}>
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
  const { conversationId, title, highlightMessageId } = route.params;
  const user = useAuthStore((s) => s.user);
  const contactAliases = useChatStore((s) => s.contactAliases);
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === conversationId));
  const messages = useChatStore((s) => s.messagesByConversation[conversationId] ?? []);
  const hasMore = useChatStore((s) => s.hasMoreByConversation[conversationId] ?? false);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const loadOlderMessages = useChatStore((s) => s.loadOlderMessages);
  const sendTextMessage = useChatStore((s) => s.sendTextMessage);
  const sendMediaMessage = useChatStore((s) => s.sendMediaMessage);
  const sendPollMessage = useChatStore((s) => s.sendPollMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const hideMessageForMe = useChatStore((s) => s.hideMessageForMe);
  const editMessage = useChatStore((s) => s.editMessage);
  const toggleReaction = useChatStore((s) => s.toggleReaction);
  const toggleStar = useChatStore((s) => s.toggleStar);
  const blockUser = useChatStore((s) => s.blockUser);
  const unblockUser = useChatStore((s) => s.unblockUser);
  const clearHistory = useChatStore((s) => s.clearHistory);
  const pinMessage = useChatStore((s) => s.pinMessage);
  const unpinMessage = useChatStore((s) => s.unpinMessage);
  const setDisappearingMessages = useChatStore((s) => s.setDisappearingMessages);
  const markRead = useChatStore((s) => s.markRead);
  const setTyping = useChatStore((s) => s.setTyping);
  const typingUsers = useChatStore((s) => s.typingUsers[conversationId]);
  const setVoiceRecording = useChatStore((s) => s.setVoiceRecording);
  const recordingUsers = useChatStore((s) => s.recordingUsers[conversationId]);
  const getConversationKey = useChatStore((s) => s.getConversationKey);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const loadDrafts = useChatStore((s) => s.loadDrafts);
  const setDraft = useChatStore((s) => s.setDraft);
  const loadScheduledMessages = useChatStore((s) => s.loadScheduledMessages);
  const scheduledCount = useChatStore((s) => s.scheduledMessagesByConversation[conversationId]?.length ?? 0);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recording, setRecording] = useState(false);
  const [replyingTo, setReplyingTo] = useState<DecryptedMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<DecryptedMessage | null>(null);
  const [actionMessage, setActionMessage] = useState<DecryptedMessage | null>(null);
  const [seenByMessage, setSeenByMessage] = useState<DecryptedMessage | null>(null);
  const [reactionDetailsMessage, setReactionDetailsMessage] = useState<DecryptedMessage | null>(null);
  const [moreReactionsMessage, setMoreReactionsMessage] = useState<DecryptedMessage | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mentionPickerVisible, setMentionPickerVisible] = useState(false);
  const [pendingMentions, setPendingMentions] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollMultipleChoice, setPollMultipleChoice] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{
    uri: string;
    name: string;
    mimeType: string;
    width?: number;
    height?: number;
    type: "IMAGE" | "FILE";
  } | null>(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const listRef = useRef<FlatList<DecryptedMessage>>(null);
  const wallpaperId = useWallpaperStore((s) => s.getWallpaperId(conversationId));
  const wallpaperColor = getWallpaperColor(wallpaperId);
  const fontScale = useChatSettingsStore((s) => s.fontScale);
  const recentEmojis = useRecentEmojiStore((s) => s.recentEmojis);
  const recordEmoji = useRecentEmojiStore((s) => s.recordEmoji);
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
    : conversation?.type === "GROUP"
      ? (() => {
          const total = conversation.participants.length;
          const onlineCount = conversation.participants.filter((p) => onlineUsers.has(p.userId)).length;
          return onlineCount > 0 ? `${total} a'zo, ${onlineCount} onlayn` : `${total} a'zo`;
        })()
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

  const onExportChat = async () => {
    if (!conversation || !user || exporting) return;
    setExporting(true);
    try {
      await exportConversation({
        conversation,
        conversationKey: getConversationKey(conversation),
        conversationTitle: otherUserDisplayName || "Suhbat",
        currentUserId: user.id,
        contactAliases,
      });
    } catch {
      Alert.alert("Xatolik", "Suhbatni eksport qilib bo'lmadi");
    } finally {
      setExporting(false);
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

  const reportUser = (reportedUserId: string, reportConversationId?: string, messageId?: string) => {
    Alert.alert("Shikoyat sababi", "Nima uchun shikoyat qilmoqchisiz?", [
      ...REPORT_REASONS.map((option) => ({
        text: option.label,
        onPress: () => {
          reportsApi
            .create({ reportedUserId, conversationId: reportConversationId, messageId, reason: option.value })
            .then(() => Alert.alert("Yuborildi", "Shikoyatingiz qabul qilindi"))
            .catch(() => Alert.alert("Xatolik", "Shikoyatni yuborib bo'lmadi"));
        },
      })),
      { text: "Bekor qilish", style: "cancel" as const },
    ]);
  };

  const onChatMenu = () => {
    if (!otherUser) return;
    Alert.alert(otherUserDisplayName, undefined, [
      { text: "🖼 Umumiy media", onPress: () => navigation.navigate("SharedMedia", { conversationId }) },
      { text: "📤 Suhbatni eksport qilish", onPress: onExportChat },
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
      { text: "🚩 Foydalanuvchini shikoyat qilish", style: "destructive", onPress: () => reportUser(otherUser.id, conversationId) },
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
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={exitSelectionMode} hitSlop={8}>
              <Text style={styles.headerInfoIcon}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onToggleSelectAll} hitSlop={8}>
              <Text style={styles.headerInfoIcon}>☑️</Text>
            </TouchableOpacity>
          </View>
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
            <TouchableOpacity onPress={onBulkHideForMe} hitSlop={8}>
              <Text style={styles.headerInfoIcon}>🙈</Text>
            </TouchableOpacity>
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
          {scheduledCount > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate("ScheduledMessages", { conversationId })} hitSlop={8}>
              <View>
                <Text style={styles.headerInfoIcon}>🕒</Text>
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{scheduledCount}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
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
    scheduledCount,
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

  useEffect(() => {
    if (!highlightMessageId || loading) return;
    let cancelled = false;

    const run = async () => {
      for (let attempt = 0; attempt < 6; attempt++) {
        const state = useChatStore.getState();
        const current = state.messagesByConversation[conversationId] ?? [];
        const index = [...current].reverse().findIndex((m) => m.id === highlightMessageId);
        if (index >= 0) {
          setTimeout(() => listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.4 }), 100);
          setHighlightedMessageId(highlightMessageId);
          setTimeout(() => setHighlightedMessageId((id) => (id === highlightMessageId ? null : id)), 1500);
          break;
        }
        if (!state.hasMoreByConversation[conversationId] || cancelled) break;
        await loadOlderMessages(conversationId);
      }
      if (!cancelled) navigation.setParams({ highlightMessageId: undefined });
    };
    run();

    return () => {
      cancelled = true;
    };
  }, [highlightMessageId, loading, conversationId, loadOlderMessages, navigation]);

  useEffect(() => {
    loadScheduledMessages(conversationId).catch(() => {});
  }, [conversationId, loadScheduledMessages]);

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

  useEffect(() => {
    return () => {
      setVoiceRecording(conversationId, false);
    };
  }, [conversationId, setVoiceRecording]);

  const conversationKey = conversation ? getConversationKey(conversation) : null;

  const scrollToLatest = () => listRef.current?.scrollToOffset({ offset: 0, animated: true });

  const getAuthorName = (senderId: string) => {
    if (senderId === user?.id) return "Siz";
    return contactAliases[senderId] ?? conversation?.participants.find((p) => p.userId === senderId)?.user.displayName ?? "";
  };

  const mentionSuggestions =
    mentionQuery !== null
      ? [
          ...(EVERYONE_MENTION.slice(1).startsWith(mentionQuery.toLowerCase())
            ? [
                {
                  key: "everyone",
                  username: EVERYONE_MENTION.slice(1),
                  label: EVERYONE_MENTION,
                  name: "Barcha a'zolar",
                  avatarUrl: null as string | null,
                  userIds: (conversation?.participants ?? []).map((p) => p.userId).filter((id) => id !== user?.id),
                },
              ]
            : []),
          ...(conversation?.participants ?? [])
            .filter(
              (p) =>
                p.userId !== user?.id && p.user.username.toLowerCase().startsWith(mentionQuery.toLowerCase())
            )
            .map((p) => ({
              key: p.userId,
              username: p.user.username,
              label: `@${p.user.username}`,
              name: contactAliases[p.userId] ?? p.user.displayName,
              avatarUrl: p.user.avatarUrl,
              userIds: [p.userId],
            })),
        ].slice(0, 5)
      : [];

  const pinnedMessages = conversation?.pinnedMessages ?? [];
  const latestPinned = pinnedMessages[0] ?? null;
  const pinnedPreview = latestPinned && conversationKey ? decryptReplyPreview(conversationKey, latestPinned) : null;

  const onPinnedBarPress = () => {
    if (!latestPinned) return;
    navigation.setParams({ highlightMessageId: latestPinned.id });
  };

  const onUnpinLatest = () => {
    if (!latestPinned) return;
    const messageId = latestPinned.id;
    Alert.alert("Qadalgan xabar", "Xabarni qadashdan olib tashlansinmi?", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "Olib tashlash", style: "destructive", onPress: () => unpinMessage(conversationId, messageId).catch(() => {}) },
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

  const onSend = async (scheduledFor?: string) => {
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
      await sendTextMessage(conversationId, trimmed, replyToId, mentions.length > 0 ? mentions : undefined, scheduledFor);
      if (scheduledFor) {
        Alert.alert("Rejalashtirildi", "Xabar belgilangan vaqtda yuboriladi");
      } else {
        scrollToLatest();
      }
    } catch (err: any) {
      setText(trimmed);
      const message = err?.response?.data?.error?.message;
      if (message) Alert.alert("Xatolik", message);
    }
  };

  const onScheduleSend = () => {
    if (!text.trim() || editingMessage) return;
    Alert.alert(
      "Keyinroq yuborish",
      "Xabarni qachon yuborish kerak?",
      [
        ...SCHEDULE_OPTIONS.map((option) => ({
          text: option.label,
          onPress: () => onSend(option.getDate().toISOString()),
        })),
        { text: "Bekor qilish", style: "cancel" as const },
      ]
    );
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
    if (isGroup) {
      const match = value.match(/(?:^|\s)@(\w*)$/);
      setMentionQuery(match ? match[1] : null);
    }
  };

  const onSelectMentionSuggestion = (username: string, userIds: string[]) => {
    setText((prev) => prev.replace(/@(\w*)$/, `@${username} `));
    setPendingMentions((prev) => Array.from(new Set([...prev, ...userIds])));
    setMentionQuery(null);
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
    setMediaCaption("");
    setPendingMedia({
      uri: asset.uri,
      name: asset.fileName ?? `photo-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
      width: asset.width,
      height: asset.height,
      type: "IMAGE",
    });
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setMediaCaption("");
    setPendingMedia({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? "application/octet-stream",
      type: "FILE",
    });
  };

  const sendPendingMedia = async (viewOnce: boolean) => {
    if (!pendingMedia) return;
    const { type, ...asset } = pendingMedia;
    const caption = mediaCaption.trim();
    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    setPendingMedia(null);
    setMediaCaption("");
    setSending(true);
    try {
      await sendMediaMessage(conversationId, asset, type, replyToId, viewOnce, caption || undefined);
      scrollToLatest();
    } catch (err: any) {
      Alert.alert(
        "Xatolik",
        err?.response?.data?.error?.message ?? (type === "IMAGE" ? "Rasmni yuborib bo'lmadi" : "Faylni yuborib bo'lmadi")
      );
    } finally {
      setSending(false);
    }
  };

  const onAttach = () => {
    Alert.alert("Yuborish", "Nimani yubormoqchisiz?", [
      { text: "🖼 Rasm", onPress: pickImage },
      { text: "📄 Fayl", onPress: pickFile },
      { text: "👤 Kontakt", onPress: () => navigation.navigate("ShareContact", { conversationId }) },
      { text: "📊 So'rovnoma", onPress: openPollModal },
      { text: "Bekor qilish", style: "cancel" },
    ]);
  };

  const openPollModal = () => {
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollMultipleChoice(false);
    setPollModalVisible(true);
  };

  const onChangePollOption = (index: number, value: string) => {
    setPollOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const onAddPollOption = () => {
    setPollOptions((prev) => (prev.length < 10 ? [...prev, ""] : prev));
  };

  const onRemovePollOption = (index: number) => {
    setPollOptions((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev));
  };

  const onSubmitPoll = async () => {
    const question = pollQuestion.trim();
    const options = pollOptions.map((o) => o.trim()).filter((o) => o.length > 0);
    if (!question || options.length < 2) return;

    setPollModalVisible(false);
    try {
      await sendPollMessage(conversationId, question, options, pollMultipleChoice);
      scrollToLatest();
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "So'rovnomani yuborib bo'lmadi");
    }
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
    setVoiceRecording(conversationId, true);
  };

  const cancelRecording = async () => {
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    setRecording(false);
    setVoiceRecording(conversationId, false);
  };

  const sendRecording = async () => {
    const durationMs = recorderState.durationMillis;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    setRecording(false);
    setVoiceRecording(conversationId, false);

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

  const onHideForMe = (item: DecryptedMessage) => {
    Alert.alert("Xabarni mendan o'chirish", "Bu xabar faqat siz uchun o'chiriladi, boshqalar uni ko'rishda davom etadi", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "O'chirish", style: "destructive", onPress: () => hideMessageForMe(conversationId, item.id).catch(() => {}) },
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

  const onToggleSelectAll = () => {
    const selectableIds = messages.filter((m) => !m.deletedAt).map((m) => m.id);
    if (selectedIds.size >= selectableIds.length) {
      exitSelectionMode();
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  };

  const onPressMessage = (item: DecryptedMessage) => {
    if (!selectionMode || item.deletedAt) return;
    toggleSelected(item.id);
  };

  const onBulkForward = () => {
    const ids = [...selectedIds].filter((id) => {
      const message = messages.find((m) => m.id === id);
      return message && !message.deletedAt && !message.decryptFailed && !message.viewOnce;
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

  const onBulkHideForMe = () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    Alert.alert("Tanlangan xabarlarni mendan o'chirish", `${ids.length} ta xabar faqat siz uchun o'chiriladi`, [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          for (const id of ids) {
            await hideMessageForMe(conversationId, id).catch(() => {});
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
    const isSticker =
      item.type === "TEXT" && !item.deletedAt && !item.decryptFailed && isEmojiOnlyMessage(item.text ?? "");

    let content;
    if (item.deletedAt) {
      content = <Text style={styles.deletedText}>🚫 Xabar o'chirildi</Text>;
    } else if (item.decryptFailed) {
      content = <Text style={styles.messageText}>🔒 Xabarni ochib bo'lmadi</Text>;
    } else if (item.type === "IMAGE" && item.viewOnce && conversationKey) {
      content = (
        <ViewOnceImageBubble
          message={item}
          conversationKey={conversationKey}
          conversationId={conversationId}
          isOwn={isOwn}
          canView={!item.viewedAt && (!isOwn || !!conversation?.isSelf)}
        />
      );
    } else if (item.type === "IMAGE" && conversationKey) {
      content = <MediaImageBubble message={item} conversationKey={conversationKey} />;
    } else if (item.type === "AUDIO" && conversationKey) {
      content = <MediaAudioBubble message={item} conversationKey={conversationKey} />;
    } else if ((item.type === "FILE" || item.type === "VIDEO") && conversationKey) {
      content = <MediaFileBubble message={item} conversationKey={conversationKey} />;
    } else if (item.type === "CONTACT") {
      content = <ContactCardBubble message={item} navigation={navigation} />;
    } else if (item.type === "POLL") {
      content = <PollBubble message={item} conversationId={conversationId} />;
    } else if (isSticker) {
      content = <Text style={styles.stickerText}>{item.text}</Text>;
    } else {
      content = renderMessageText(item.text ?? "", conversation?.participants ?? [], fontScale);
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
            isSticker && styles.bubbleSticker,
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
          {!item.deletedAt &&
            !item.decryptFailed &&
            !!item.text &&
            (item.type === "FILE" || (item.type === "IMAGE" && !item.viewOnce) || item.type === "VIDEO") && (
              <View style={styles.mediaCaption}>{renderMessageText(item.text, conversation?.participants ?? [], fontScale)}</View>
            )}
          {linkUrl && <LinkPreviewCard url={linkUrl} />}
          {!item.deletedAt && item.reactions.length > 0 && (
            <View style={styles.reactionsRow}>
              {groupReactions(item.reactions).map(({ emoji, userIds }) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.reactionBadge, userIds.includes(user!.id) && styles.reactionBadgeActive]}
                  onPress={() => toggleReaction(conversationId, item.id, emoji).catch(() => {})}
                  onLongPress={() => setReactionDetailsMessage(item)}
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
  const recordingCount = recordingUsers?.size ?? 0;
  const invertedData = [...messages].reverse();

  return (
    <>
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: wallpaperColor }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {pinnedPreview && (
        <TouchableOpacity style={styles.pinnedBar} onPress={onPinnedBarPress}>
          <Text style={styles.pinnedIcon}>📌</Text>
          <View style={styles.replyContent}>
            <Text style={styles.replyAuthor} numberOfLines={1}>
              {getAuthorName(pinnedPreview.senderId)}
              {pinnedMessages.length > 1 ? ` · 1/${pinnedMessages.length}` : ""}
            </Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {getPreviewLabel(pinnedPreview)}
            </Text>
          </View>
          {pinnedMessages.length > 1 && (
            <TouchableOpacity onPress={() => navigation.navigate("PinnedMessages", { conversationId, title })} hitSlop={8}>
              <Text style={styles.pinnedListIcon}>☰</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onUnpinLatest} hitSlop={8}>
            <Text style={styles.pinnedClose}>✕</Text>
          </TouchableOpacity>
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
      {recordingCount > 0 ? (
        <Text style={styles.typing}>🎤 ovozli xabar yozmoqda...</Text>
      ) : (
        typingCount > 0 && <Text style={styles.typing}>yozmoqda...</Text>
      )}
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
        <>
          {mentionSuggestions.length > 0 && (
            <View style={styles.mentionSuggestions}>
              {mentionSuggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.key}
                  style={styles.mentionSuggestionRow}
                  onPress={() => onSelectMentionSuggestion(suggestion.username, suggestion.userIds)}
                >
                  <Avatar uri={suggestion.avatarUrl} name={suggestion.name} size={28} />
                  <Text style={styles.mentionSuggestionLabel} numberOfLines={1}>
                    {suggestion.label}
                  </Text>
                  <Text style={styles.mentionSuggestionName} numberOfLines={1}>
                    {suggestion.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
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
              <TouchableOpacity
                style={styles.sendButton}
                onPress={() => onSend()}
                onLongPress={onScheduleSend}
                disabled={!!editingMessage}
              >
                <Text style={styles.sendText}>Yuborish</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.attachButton} onPress={startRecording} disabled={sending || !!editingMessage}>
                <Text style={styles.attachIcon}>🎤</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </KeyboardAvoidingView>
    <Modal visible={!!actionMessage} transparent animationType="fade" onRequestClose={() => setActionMessage(null)}>
      <Pressable style={styles.actionBackdrop} onPress={() => setActionMessage(null)}>
        <Pressable style={styles.actionSheet}>
          <View style={styles.reactionPickerRow}>
            {recentEmojis.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionPickerOption}
                onPress={() => {
                  if (actionMessage) toggleReaction(conversationId, actionMessage.id, emoji).catch(() => {});
                  recordEmoji(emoji).catch(() => {});
                  setActionMessage(null);
                }}
              >
                <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.reactionPickerOption}
              onPress={() => {
                setMoreReactionsMessage(actionMessage);
                setActionMessage(null);
              }}
            >
              <Text style={styles.reactionPickerMore}>➕</Text>
            </TouchableOpacity>
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
            (actionMessage.type === "TEXT" ||
              actionMessage.type === "IMAGE" ||
              actionMessage.type === "VIDEO" ||
              actionMessage.type === "FILE") &&
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
                const isPinned = pinnedMessages.some((pm) => pm.id === message.id);
                (isPinned ? unpinMessage(conversationId, message.id) : pinMessage(conversationId, message.id)).catch(
                  () => {}
                );
              }}
            >
              <Text style={styles.actionButtonText}>
                {pinnedMessages.some((pm) => pm.id === actionMessage.id) ? "📌 Qadashni bekor qilish" : "📌 Qadash"}
              </Text>
            </TouchableOpacity>
          )}
          {actionMessage && isGroup && actionMessage.senderId === user?.id && !actionMessage.deletedAt && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                const message = actionMessage;
                setActionMessage(null);
                setSeenByMessage(message);
              }}
            >
              <Text style={styles.actionButtonText}>👁 Kim ko'rdi</Text>
            </TouchableOpacity>
          )}
          {actionMessage && !actionMessage.decryptFailed && !actionMessage.viewOnce && (
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
          {actionMessage && !actionMessage.deletedAt && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                const message = actionMessage;
                setActionMessage(null);
                onHideForMe(message);
              }}
            >
              <Text style={[styles.actionButtonText, styles.actionButtonDanger]}>🙈 Mendan o'chirish</Text>
            </TouchableOpacity>
          )}
          {actionMessage &&
            actionMessage.senderId !== user?.id &&
            !actionMessage.deletedAt &&
            !actionMessage.decryptFailed && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  const message = actionMessage;
                  setActionMessage(null);
                  reportUser(message.senderId, conversationId, message.id);
                }}
              >
                <Text style={[styles.actionButtonText, styles.actionButtonDanger]}>🚩 Xabarni shikoyat qilish</Text>
              </TouchableOpacity>
            )}
          <TouchableOpacity style={styles.actionButton} onPress={() => setActionMessage(null)}>
            <Text style={styles.actionButtonText}>Bekor qilish</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
    <Modal
      visible={!!moreReactionsMessage}
      transparent
      animationType="fade"
      onRequestClose={() => setMoreReactionsMessage(null)}
    >
      <Pressable style={styles.actionBackdrop} onPress={() => setMoreReactionsMessage(null)}>
        <Pressable style={styles.actionSheet}>
          <Text style={styles.mentionPickerTitle}>Reaksiya tanlang</Text>
          <View style={styles.moreReactionsGrid}>
            {MORE_REACTIONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionPickerOption}
                onPress={() => {
                  if (moreReactionsMessage) toggleReaction(conversationId, moreReactionsMessage.id, emoji).catch(() => {});
                  recordEmoji(emoji).catch(() => {});
                  setMoreReactionsMessage(null);
                }}
              >
                <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
    <Modal visible={!!seenByMessage} transparent animationType="fade" onRequestClose={() => setSeenByMessage(null)}>
      <Pressable style={styles.actionBackdrop} onPress={() => setSeenByMessage(null)}>
        <Pressable style={styles.actionSheet}>
          <Text style={styles.mentionPickerTitle}>Kim ko'rdi</Text>
          <ScrollView style={styles.seenByList}>
            {seenByMessage &&
              (() => {
                const others = conversation?.participants.filter((p) => p.userId !== user?.id) ?? [];
                const read = others.filter((p) => isMessageRead(seenByMessage, p));
                const unread = others.filter((p) => !isMessageRead(seenByMessage, p));
                return (
                  <>
                    {read.length > 0 && (
                      <Text style={styles.seenBySectionLabel}>Ko'rgan ({read.length})</Text>
                    )}
                    {read.map((p) => (
                      <View key={p.userId} style={styles.seenByRow}>
                        <Avatar uri={p.user.avatarUrl} name={contactAliases[p.userId] ?? p.user.displayName} size={36} />
                        <Text style={styles.seenByName}>{contactAliases[p.userId] ?? p.user.displayName}</Text>
                      </View>
                    ))}
                    {unread.length > 0 && (
                      <Text style={styles.seenBySectionLabel}>Hali ko'rmagan ({unread.length})</Text>
                    )}
                    {unread.map((p) => (
                      <View key={p.userId} style={styles.seenByRow}>
                        <Avatar uri={p.user.avatarUrl} name={contactAliases[p.userId] ?? p.user.displayName} size={36} />
                        <Text style={styles.seenByName}>{contactAliases[p.userId] ?? p.user.displayName}</Text>
                      </View>
                    ))}
                  </>
                );
              })()}
          </ScrollView>
          <TouchableOpacity style={styles.actionButton} onPress={() => setSeenByMessage(null)}>
            <Text style={styles.actionButtonText}>Yopish</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
    <Modal
      visible={!!reactionDetailsMessage}
      transparent
      animationType="fade"
      onRequestClose={() => setReactionDetailsMessage(null)}
    >
      <Pressable style={styles.actionBackdrop} onPress={() => setReactionDetailsMessage(null)}>
        <Pressable style={styles.actionSheet}>
          <Text style={styles.mentionPickerTitle}>Reaksiyalar</Text>
          <ScrollView style={styles.seenByList}>
            {reactionDetailsMessage &&
              groupReactions(reactionDetailsMessage.reactions).map(({ emoji, userIds }) => (
                <View key={emoji}>
                  <Text style={styles.seenBySectionLabel}>
                    {emoji} {userIds.length}
                  </Text>
                  {userIds.map((uid) => {
                    const participant = conversation?.participants.find((p) => p.userId === uid);
                    return (
                      <View key={uid} style={styles.seenByRow}>
                        <Avatar uri={participant?.user.avatarUrl} name={getAuthorName(uid)} size={36} />
                        <Text style={styles.seenByName}>{getAuthorName(uid)}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
          </ScrollView>
          <TouchableOpacity style={styles.actionButton} onPress={() => setReactionDetailsMessage(null)}>
            <Text style={styles.actionButtonText}>Yopish</Text>
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
    <Modal visible={pollModalVisible} animationType="slide" onRequestClose={() => setPollModalVisible(false)}>
      <KeyboardAvoidingView
        style={styles.pollContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.searchHeader}>
          <TouchableOpacity onPress={() => setPollModalVisible(false)}>
            <Text style={styles.searchClose}>Bekor qilish</Text>
          </TouchableOpacity>
          <Text style={styles.pollHeaderTitle}>Yangi so'rovnoma</Text>
          <TouchableOpacity
            onPress={onSubmitPoll}
            disabled={!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2}
          >
            <Text
              style={[
                styles.searchClose,
                (!pollQuestion.trim() || pollOptions.filter((o) => o.trim()).length < 2) && styles.pollSendDisabled,
              ]}
            >
              Yuborish
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.pollBody} keyboardShouldPersistTaps="handled">
          <Text style={styles.pollLabel}>Savol</Text>
          <TextInput
            style={styles.pollInput}
            value={pollQuestion}
            onChangeText={setPollQuestion}
            placeholder="Savolingizni yozing"
            placeholderTextColor={colors.textSecondary}
            multiline
          />
          <Text style={styles.pollLabel}>Variantlar</Text>
          {pollOptions.map((option, index) => (
            <View key={index} style={styles.pollOptionRow}>
              <TextInput
                style={[styles.pollInput, styles.pollOptionInput]}
                value={option}
                onChangeText={(value) => onChangePollOption(index, value)}
                placeholder={`Variant ${index + 1}`}
                placeholderTextColor={colors.textSecondary}
              />
              {pollOptions.length > 2 && (
                <TouchableOpacity onPress={() => onRemovePollOption(index)} hitSlop={8}>
                  <Text style={styles.pollRemoveOption}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {pollOptions.length < 10 && (
            <TouchableOpacity onPress={onAddPollOption}>
              <Text style={styles.pollAddOption}>+ Variant qo'shish</Text>
            </TouchableOpacity>
          )}
          <View style={styles.pollSwitchRow}>
            <Text style={styles.pollSwitchLabel}>Bir nechta javob</Text>
            <Switch value={pollMultipleChoice} onValueChange={setPollMultipleChoice} trackColor={{ true: colors.primary }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
    <Modal visible={exporting} transparent animationType="fade">
      <View style={styles.exportOverlay}>
        <View style={styles.exportBox}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.exportText}>Eksport qilinmoqda...</Text>
        </View>
      </View>
    </Modal>
    <Modal visible={!!pendingMedia} transparent animationType="fade" onRequestClose={() => setPendingMedia(null)}>
      <KeyboardAvoidingView
        style={styles.mediaPreviewBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.mediaPreviewSheet}>
          {pendingMedia?.type === "IMAGE" ? (
            <Image source={{ uri: pendingMedia.uri }} style={styles.mediaPreviewImage} resizeMode="contain" />
          ) : (
            <View style={styles.mediaPreviewFile}>
              <Text style={styles.mediaPreviewFileIcon}>📄</Text>
              <Text style={styles.mediaPreviewFileName} numberOfLines={2}>
                {pendingMedia?.name}
              </Text>
            </View>
          )}
          <TextInput
            style={styles.mediaCaptionInput}
            placeholder="Izoh qo'shish..."
            placeholderTextColor={colors.textSecondary}
            value={mediaCaption}
            onChangeText={setMediaCaption}
            multiline
          />
          <View style={styles.mediaPreviewActions}>
            <TouchableOpacity style={styles.mediaPreviewCancel} onPress={() => setPendingMedia(null)} disabled={sending}>
              <Text style={styles.mediaPreviewCancelText}>Bekor qilish</Text>
            </TouchableOpacity>
            {pendingMedia?.type === "IMAGE" && (
              <TouchableOpacity
                style={styles.mediaPreviewViewOnce}
                onPress={() => sendPendingMedia(true)}
                disabled={sending}
              >
                <Text style={styles.mediaPreviewViewOnceText}>🔥</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.mediaPreviewSend} onPress={() => sendPendingMedia(false)} disabled={sending}>
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.mediaPreviewSendText}>Yuborish</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  bubbleSticker: { backgroundColor: "transparent", paddingHorizontal: 0, paddingVertical: 0 },
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
  pinnedListIcon: { fontSize: 16, color: colors.textSecondary, paddingHorizontal: 4 },
  pinnedClose: { fontSize: 16, color: colors.textSecondary, paddingHorizontal: 4 },
  messageText: { fontSize: 16, color: colors.text },
  stickerText: { fontSize: 56, lineHeight: 64 },
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
  spoilerHidden: {
    backgroundColor: colors.textSecondary,
    color: "transparent",
    borderRadius: 3,
  },
  mentionPickerTitle: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: 8 },
  seenByList: { maxHeight: 320 },
  seenBySectionLabel: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginTop: 12, marginBottom: 6 },
  seenByRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  seenByName: { fontSize: 15, color: colors.text },
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
  reactionPickerMore: { fontSize: 22, color: colors.textSecondary },
  moreReactionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingBottom: 16,
  },
  actionButton: { paddingVertical: 14, alignItems: "center" },
  actionButtonText: { fontSize: 16, color: colors.text },
  actionButtonDanger: { color: colors.danger },
  headerInfoIcon: { fontSize: 20, marginRight: 12 },
  headerActions: { flexDirection: "row", alignItems: "center" },
  headerBadge: {
    position: "absolute",
    top: -4,
    right: 6,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  headerBadgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  headerTitleContainer: { alignItems: "center" },
  headerTitleText: { fontSize: 17, fontWeight: "600", color: colors.text },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary },
  typing: { paddingHorizontal: 16, paddingBottom: 4, color: colors.textSecondary, fontSize: 12 },
  mentionSuggestions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    maxHeight: 220,
  },
  mentionSuggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  mentionSuggestionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
  },
  mentionSuggestionName: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
  },
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
  pollContainer: { flex: 1, backgroundColor: colors.background },
  pollHeaderTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  pollSendDisabled: { color: colors.textSecondary },
  pollBody: { flex: 1, padding: 16 },
  pollLabel: { fontSize: 13, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
  pollInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  pollOptionRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  pollOptionInput: { flex: 1, marginTop: 0 },
  pollRemoveOption: { fontSize: 18, color: colors.textSecondary, padding: 4 },
  pollAddOption: { color: colors.primary, fontWeight: "600", fontSize: 15, marginTop: 12 },
  pollSwitchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24 },
  pollSwitchLabel: { fontSize: 15, color: colors.text },
  exportOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  exportBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 12,
  },
  exportText: { fontSize: 14, color: colors.text },
  mediaCaption: { marginTop: 6 },
  mediaPreviewBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  mediaPreviewSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 12,
  },
  mediaPreviewImage: {
    width: "100%",
    height: 280,
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  mediaPreviewFile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
  },
  mediaPreviewFileIcon: { fontSize: 32 },
  mediaPreviewFileName: { flex: 1, fontSize: 15, color: colors.text },
  mediaCaptionInput: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
  },
  mediaPreviewActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  mediaPreviewCancel: { paddingVertical: 12, paddingHorizontal: 8 },
  mediaPreviewCancelText: { color: colors.textSecondary, fontSize: 15, fontWeight: "600" },
  mediaPreviewViewOnce: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  mediaPreviewViewOnceText: { fontSize: 20 },
  mediaPreviewSend: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  mediaPreviewSendText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
