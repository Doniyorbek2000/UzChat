import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Share,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
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
import { useChatStore, DecryptedMessage, ReplyPreview, decryptReplyPreview } from "../../store/chatStore";
import { chatsApi } from "../../api/chats";
import { decryptMessage, getSecurityCode } from "../../crypto/e2ee";
import { useAuthStore } from "../../store/authStore";
import { useVerifiedContactsStore } from "../../store/verifiedContactsStore";
import { useWallpaperStore } from "../../store/wallpaperStore";
import { useChatSettingsStore } from "../../store/chatSettingsStore";
import { useRecentEmojiStore } from "../../store/recentEmojiStore";
import { useRecentStickersStore } from "../../store/recentStickersStore";
import { useQuickRepliesStore } from "../../store/quickRepliesStore";
import { getCustomWallpaperUri, getWallpaperColor } from "../../theme/wallpapers";
import { STICKER_PACKS } from "../../utils/stickerPacks";
import { ConversationParticipant, MessageReaction, MessageType } from "../../types";
import { translateText, LANGUAGES, LanguageCode } from "../../api/translate";
import { searchGifs, getTrendingGifs, GifResult } from "../../api/gif";
import { colors } from "../../theme/colors";
import { MediaImageBubble } from "../../components/MediaImageBubble";
import { ImageGalleryViewer } from "../../components/ImageGalleryViewer";
import { ViewOnceImageBubble } from "../../components/ViewOnceImageBubble";
import { ViewOnceAudioBubble } from "../../components/ViewOnceAudioBubble";
import { ViewOnceVideoBubble } from "../../components/ViewOnceVideoBubble";
import { MediaFileBubble } from "../../components/MediaFileBubble";
import { MediaVideoBubble } from "../../components/MediaVideoBubble";
import { MediaAudioBubble } from "../../components/MediaAudioBubble";
import { ContactCardBubble } from "../../components/ContactCardBubble";
import { PollBubble } from "../../components/PollBubble";
import { Avatar } from "../../components/Avatar";
import { LinkPreviewCard } from "../../components/LinkPreviewCard";
import { TypingIndicator } from "../../components/TypingIndicator";
import { SwipeableMessageRow } from "../../components/SwipeableMessageRow";
import { extractFirstUrl } from "../../utils/linkPreview";
import { formatDuration } from "../../utils/mediaFile";
import { formatTime, formatDateSeparator, formatDateTime, getConversationDisplay } from "../../utils/conversation";
import { UZ_MONTHS } from "../../utils/birthday";
import { DISAPPEARING_MESSAGE_OPTIONS, formatDisappearingDuration } from "../../utils/disappearingMessages";
import { SCHEDULE_OPTIONS } from "../../utils/scheduledMessages";
import { POLL_DEADLINE_OPTIONS, formatPollDeadline } from "../../utils/pollDeadline";
import { PIN_DURATION_OPTIONS, formatPinTimeRemaining } from "../../utils/pinExpiry";
import { REMINDER_DURATION_OPTIONS } from "../../utils/messageReminders";
import { AUTO_DELETE_OPTIONS, formatAutoDeleteDuration } from "../../utils/chatAutoDelete";
import { setActiveConversationId } from "../../utils/pushNotifications";
import { exportConversation } from "../../utils/chatExport";
import { reportsApi } from "../../api/reports";
import { REPORT_REASONS } from "../../utils/reportReasons";
import { getPreviewLabel } from "../../utils/messagePreview";
import { FORMAT_PATTERN } from "../../utils/textFormat";
import { showChatNotificationSettings } from "../../utils/chatNotificationSettings";

type Props = NativeStackScreenProps<RootStackParamList, "ChatRoom">;

interface PendingMediaItem {
  uri: string;
  name: string;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  type: "IMAGE" | "FILE" | "VIDEO";
  // True when this is an image picked to be sent uncompressed as a document
  // (type is "FILE" on send, but the preview still shows the image thumbnail).
  isUncompressedImage?: boolean;
}

const RECALL_WINDOW_MS = 48 * 60 * 60 * 1000;

function isMessageRead(message: { createdAt: string }, participant: ConversationParticipant) {
  return !!participant.lastReadAt && new Date(participant.lastReadAt) >= new Date(message.createdAt);
}

function isMessageDelivered(message: { createdAt: string }, participant: ConversationParticipant) {
  return !!participant.lastDeliveredAt && new Date(participant.lastDeliveredAt) >= new Date(message.createdAt);
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

const WEEKDAY_LABELS = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];

const SEARCH_TYPE_FILTERS: { type: MessageType | "ALL"; label: string }[] = [
  { type: "ALL", label: "Hammasi" },
  { type: "IMAGE", label: "🖼 Rasm" },
  { type: "VIDEO", label: "🎬 Video" },
  { type: "AUDIO", label: "🎤 Ovozli" },
  { type: "FILE", label: "📄 Fayl" },
  { type: "POLL", label: "📊 So'rovnoma" },
  { type: "LOCATION", label: "📍 Joylashuv" },
  { type: "STICKER", label: "🏷 Stiker" },
];

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

const TOKEN_PATTERN = /(@[a-zA-Z0-9_]+|#[a-zA-Z0-9_]+|https?:\/\/[^\s<>"]+)/g;
const EVERYONE_MENTION = "@hammasi";
const ADMIN_MENTION = "@adminlar";

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

function renderMessageText(
  text: string,
  participants: ConversationParticipant[],
  fontScale: number,
  navigation: Props["navigation"],
  onHashtagPress: (tag: string) => void
) {
  const usernameToId = new Map(participants.map((p) => [p.user.username, p.userId]));
  const parts = text.split(TOKEN_PATTERN);
  return (
    <Text style={[styles.messageText, { fontSize: 16 * fontScale }]}>
      {parts.map((part, i) => {
        if (part === EVERYONE_MENTION || part === ADMIN_MENTION) {
          return (
            <Text key={i} style={styles.mentionText}>
              {part}
            </Text>
          );
        }
        if (part.startsWith("@") && usernameToId.has(part.slice(1))) {
          const userId = usernameToId.get(part.slice(1))!;
          return (
            <Text key={i} style={styles.mentionText} onPress={() => navigation.navigate("UserProfile", { userId })}>
              {part}
            </Text>
          );
        }
        if (/^#[a-zA-Z0-9_]+$/.test(part)) {
          return (
            <Text key={i} style={styles.hashtagText} onPress={() => onHashtagPress(part)}>
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
  const closePoll = useChatStore((s) => s.closePoll);
  const patUser = useChatStore((s) => s.patUser);
  const blockUser = useChatStore((s) => s.blockUser);
  const unblockUser = useChatStore((s) => s.unblockUser);
  const clearHistory = useChatStore((s) => s.clearHistory);
  const pinMessage = useChatStore((s) => s.pinMessage);
  const unpinMessage = useChatStore((s) => s.unpinMessage);
  const setReminder = useChatStore((s) => s.setReminder);
  const forwardMessage = useChatStore((s) => s.forwardMessage);
  const getOrCreateSavedMessages = useChatStore((s) => s.getOrCreateSavedMessages);
  const createDirectConversation = useChatStore((s) => s.createDirectConversation);
  const setDisappearingMessages = useChatStore((s) => s.setDisappearingMessages);
  const setAutoDelete = useChatStore((s) => s.setAutoDelete);
  const setNoForwards = useChatStore((s) => s.setNoForwards);
  const setNotificationPreview = useChatStore((s) => s.setNotificationPreview);
  const setReadReceiptsOverride = useChatStore((s) => s.setReadReceiptsOverride);
  const markRead = useChatStore((s) => s.markRead);
  const setTyping = useChatStore((s) => s.setTyping);
  const typingUsers = useChatStore((s) => s.typingUsers[conversationId]);
  const setVoiceRecording = useChatStore((s) => s.setVoiceRecording);
  const recordingUsers = useChatStore((s) => s.recordingUsers[conversationId]);
  const getConversationKey = useChatStore((s) => s.getConversationKey);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const keyChangeAlerts = useChatStore((s) => s.keyChangeAlerts.filter((a) => a.conversationId === conversationId));
  const loadDrafts = useChatStore((s) => s.loadDrafts);
  const setDraft = useChatStore((s) => s.setDraft);
  const quickReplies = useQuickRepliesStore((s) => s.quickReplies);
  const loadScheduledMessages = useChatStore((s) => s.loadScheduledMessages);
  const scheduledCount = useChatStore((s) => s.scheduledMessagesByConversation[conversationId]?.length ?? 0);

  const [text, setText] = useState("");
  const [selection, setSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [viewedMentionIds, setViewedMentionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recording, setRecording] = useState(false);
  const [replyingTo, setReplyingTo] = useState<DecryptedMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<DecryptedMessage | null>(null);
  const [actionMessage, setActionMessage] = useState<DecryptedMessage | null>(null);
  const [seenByMessage, setSeenByMessage] = useState<DecryptedMessage | null>(null);
  const [messageInfoMessage, setMessageInfoMessage] = useState<DecryptedMessage | null>(null);
  const [descriptionBannerDismissed, setDescriptionBannerDismissed] = useState(false);
  const [pinnedIndex, setPinnedIndex] = useState(0);
  const [reactionDetailsMessage, setReactionDetailsMessage] = useState<DecryptedMessage | null>(null);
  const [pollVotesMessage, setPollVotesMessage] = useState<DecryptedMessage | null>(null);
  const [moreReactionsMessage, setMoreReactionsMessage] = useState<DecryptedMessage | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [translateLang, setTranslateLang] = useState<LanguageCode>("uz");
  const [showTranslateLangPicker, setShowTranslateLangPicker] = useState(false);
  const [pendingTranslateMsg, setPendingTranslateMsg] = useState<DecryptedMessage | null>(null);
  const [gifPickerVisible, setGifPickerVisible] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifResults, setGifResults] = useState<GifResult[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [customReactionEmoji, setCustomReactionEmoji] = useState("");
  const [editHistoryMessage, setEditHistoryMessage] = useState<DecryptedMessage | null>(null);
  const [editHistoryEntries, setEditHistoryEntries] = useState<{ text: string; editedAt: string }[]>([]);
  const [loadingEditHistory, setLoadingEditHistory] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mentionPickerVisible, setMentionPickerVisible] = useState(false);
  const [pendingMentions, setPendingMentions] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [quickReplyPickerVisible, setQuickReplyPickerVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoadingMore, setSearchLoadingMore] = useState(false);
  const [searchSenderId, setSearchSenderId] = useState<string | null>(null);
  const [searchTypeFilter, setSearchTypeFilter] = useState<MessageType | "ALL">("ALL");
  const [dateJumpVisible, setDateJumpVisible] = useState(false);
  const [dateJumpMonth, setDateJumpMonth] = useState(() => new Date());
  const [dateJumpSearching, setDateJumpSearching] = useState(false);
  const [stickerPickerVisible, setStickerPickerVisible] = useState(false);
  const [activeStickerPackIndex, setActiveStickerPackIndex] = useState(0);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollMultipleChoice, setPollMultipleChoice] = useState(false);
  const [pollAnonymous, setPollAnonymous] = useState(false);
  const [pollQuiz, setPollQuiz] = useState(false);
  const [pollCorrectIndex, setPollCorrectIndex] = useState<number | null>(null);
  const [pollQuizExplanation, setPollQuizExplanation] = useState("");
  const [pollDeadlineSeconds, setPollDeadlineSeconds] = useState<number | null>(null);
  const [pendingMedia, setPendingMedia] = useState<PendingMediaItem | null>(null);
  const [galleryMessageId, setGalleryMessageId] = useState<string | null>(null);
  const [pendingMediaQueue, setPendingMediaQueue] = useState<PendingMediaItem[]>([]);
  const [pendingMediaTotal, setPendingMediaTotal] = useState(0);
  const [mediaCaption, setMediaCaption] = useState("");
  const [mediaSpoiler, setMediaSpoiler] = useState(false);
  const [mediaUploadProgress, setMediaUploadProgress] = useState<number | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const listRef = useRef<FlatList<DecryptedMessage>>(null);
  const wallpaperId = useWallpaperStore((s) => s.getWallpaperId(conversationId));
  const wallpaperColor = getWallpaperColor(wallpaperId);
  const customWallpaperUri = getCustomWallpaperUri(wallpaperId);
  const fontScale = useChatSettingsStore((s) => s.fontScale);
  const quickReactionEmoji = useChatSettingsStore((s) => s.quickReactionEmoji);
  const setQuickReactionEmoji = useChatSettingsStore((s) => s.setQuickReactionEmoji);
  const recentEmojis = useRecentEmojiStore((s) => s.recentEmojis);
  const recordEmoji = useRecentEmojiStore((s) => s.recordEmoji);
  const recentStickers = useRecentStickersStore((s) => s.recentStickers);
  const recordSticker = useRecentStickersStore((s) => s.recordSticker);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const otherParticipant =
    conversation?.type === "DIRECT" ? conversation.participants.find((p) => p.userId !== user?.id) : null;
  const otherUser = otherParticipant?.user ?? null;
  const verifiedSecurityCodes = useVerifiedContactsStore((s) => s.verified);
  const currentSecurityCode = otherUser && user ? getSecurityCode(user.publicKey, otherUser.publicKey) : null;
  const verifiedSecurityCode = otherUser ? verifiedSecurityCodes[otherUser.id] : undefined;
  const securityCodeChanged = (!!verifiedSecurityCode && !!currentSecurityCode && verifiedSecurityCode !== currentSecurityCode) || keyChangeAlerts.length > 0;
  const [keyChangeBannerDismissed, setKeyChangeBannerDismissed] = useState(false);
  const otherUserDisplayName = otherUser ? (contactAliases[otherUser.id] ?? otherUser.displayName) : "";
  const isOtherOnline = otherUser ? onlineUsers.has(otherUser.id) : false;
  const presenceLabel = otherUser
    ? isOtherOnline
      ? "Onlayn"
      : otherUser.lastSeenAt
        ? `Oxirgi marta: ${formatTime(otherUser.lastSeenAt)}`
        : ""
    : (conversation?.type === "GROUP" || conversation?.type === "CHANNEL")
      ? (() => {
          const total = conversation.participants.length;
          const onlineCount = conversation.participants.filter((p) => onlineUsers.has(p.userId)).length;
          const memberLabel = conversation.type === "CHANNEL" ? "obunachi" : "a'zo";
          return onlineCount > 0 ? `${total} ${memberLabel}, ${onlineCount} onlayn` : `${total} ${memberLabel}`;
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

  const onOpenGifPicker = async () => {
    setGifPickerVisible(true);
    setGifSearch("");
    setGifLoading(true);
    try {
      const results = await getTrendingGifs(30);
      setGifResults(results);
    } catch {
      setGifResults([]);
    } finally {
      setGifLoading(false);
    }
  };

  const onSearchGif = async (query: string) => {
    setGifSearch(query);
    if (!query.trim()) {
      setGifLoading(true);
      try { setGifResults(await getTrendingGifs(30)); } catch { setGifResults([]); }
      setGifLoading(false);
      return;
    }
    setGifLoading(true);
    try { setGifResults(await searchGifs(query.trim(), 30)); } catch { setGifResults([]); }
    setGifLoading(false);
  };

  const onSendGif = (gif: GifResult) => {
    setGifPickerVisible(false);
    sendTextMessage(conversationId, gif.url).catch(() => {});
  };

  const onTranslateMessage = async (msg: DecryptedMessage, targetLang: LanguageCode) => {
    if (!msg.text || translations[msg.id]) return;
    setTranslatingId(msg.id);
    try {
      const translated = await translateText(msg.text, "auto", targetLang);
      setTranslations((prev) => ({ ...prev, [msg.id]: translated }));
    } catch {
      Alert.alert("Xatolik", "Tarjima qilib bo'lmadi");
    } finally {
      setTranslatingId(null);
      setActionMessage(null);
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

  const onSetAutoDelete = () => {
    Alert.alert(
      "Faolsizlikda avtomatik o'chirish",
      "Suhbatda uzoq vaqt yangi xabar bo'lmasa, u faqat sizning ro'yxatingizdan olib tashlanadi",
      [
        ...AUTO_DELETE_OPTIONS.map((option) => ({
          text: option.label,
          onPress: () =>
            setAutoDelete(conversationId, option.value).catch(() => {
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
    if (!otherUser || !conversation) return;
    Alert.alert(otherUserDisplayName, undefined, [
      { text: "🖼 Umumiy media", onPress: () => navigation.navigate("SharedMedia", { conversationId }) },
      { text: "👥 Umumiy guruhlar", onPress: () => navigation.navigate("CommonGroups", { userId: otherUser.id }) },
      {
        text: "🔔 Bildirishnoma sozlamalari",
        onPress: () => showChatNotificationSettings(conversation, setNotificationPreview, setReadReceiptsOverride),
      },
      { text: "📤 Suhbatni eksport qilish", onPress: onExportChat },
      { text: "🗑 Suhbatni tozalash", onPress: onClearHistory },
      {
        text: `⏳ O'chiriladigan xabarlar (${formatDisappearingDuration(conversation?.disappearingSeconds ?? null)})`,
        onPress: onSetDisappearingMessages,
      },
      {
        text: `🗑 Faolsizlikda o'chirish (${formatAutoDeleteDuration(conversation?.autoDeleteAfterSeconds ?? null)})`,
        onPress: onSetAutoDelete,
      },
      {
        text: conversation?.noForwards
          ? "🔓 Nusxalash va yo'naltirishga ruxsat berish"
          : "🔒 Nusxalash va yo'naltirishni man qilish",
        onPress: () => setNoForwards(conversationId, !conversation?.noForwards).catch(() => {}),
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
            {canForwardOrCopy && (
              <TouchableOpacity onPress={onBulkForward} hitSlop={8}>
                <Text style={styles.headerInfoIcon}>➡️</Text>
              </TouchableOpacity>
            )}
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

    const onPressHeaderTitle = () => {
      if (conversation?.type === "GROUP" || conversation?.type === "CHANNEL") {
        navigation.navigate("GroupInfo", { conversationId });
      } else if (conversation?.type === "DIRECT" && !conversation.isSelf && otherUser) {
        navigation.navigate("UserProfile", { userId: otherUser.id });
      }
    };
    const headerTitleTappable = conversation?.type === "GROUP" || conversation?.type === "CHANNEL" || (conversation?.type === "DIRECT" && !conversation.isSelf);

    navigation.setOptions({
      title,
      headerLeft: undefined,
      headerTitle: () => (
        <TouchableOpacity
          style={styles.headerTitleContainer}
          onPress={onPressHeaderTitle}
          disabled={!headerTitleTappable}
          activeOpacity={0.6}
        >
          <Avatar
            uri={(conversation?.type === "GROUP" || conversation?.type === "CHANNEL") ? conversation.avatarUrl : otherUser?.avatarUrl}
            name={title}
            size={32}
            icon={conversation?.isSelf ? "📝" : undefined}
          />
          <View style={styles.headerTitleTextContainer}>
            <Text style={styles.headerTitleText} numberOfLines={1}>
              {title}
            </Text>
            {!!presenceLabel && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {presenceLabel}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      ),
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
          {conversation?.type === "DIRECT" && !conversation.isSelf && otherUser && (
            <>
              <TouchableOpacity onPress={() => navigation.navigate("Call", { userId: otherUser.id, displayName: otherUserDisplayName, avatarUrl: otherUser.avatarUrl, callType: "audio", isIncoming: false })} hitSlop={8}>
                <Text style={styles.headerInfoIcon}>📞</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate("Call", { userId: otherUser.id, displayName: otherUserDisplayName, avatarUrl: otherUser.avatarUrl, callType: "video", isIncoming: false })} hitSlop={8}>
                <Text style={styles.headerInfoIcon}>📹</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={() => setSearchVisible(true)} hitSlop={8}>
            <Text style={styles.headerInfoIcon}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("ChatWallpaper", { conversationId })} hitSlop={8}>
            <Text style={styles.headerInfoIcon}>🖼</Text>
          </TouchableOpacity>
          {(conversation?.type === "GROUP" || conversation?.type === "CHANNEL") ? (
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
    conversation?.isSelf,
    conversation?.noForwards,
    conversation?.avatarUrl,
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

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const isFarFromBottom = offsetY > 300;
    setShowScrollToBottom(isFarFromBottom);
    if (!isFarFromBottom) setNewMessagesCount(0);
  };

  const onScrollToBottomPress = () => {
    scrollToLatest();
    setNewMessagesCount(0);
  };

  const prevMessagesLengthRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessagesLengthRef.current && showScrollToBottom) {
      const newMessages = messages.slice(prevMessagesLengthRef.current);
      const incomingCount = newMessages.filter((m) => m.senderId !== user?.id).length;
      if (incomingCount > 0) setNewMessagesCount((c) => c + incomingCount);
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages, showScrollToBottom, user?.id]);

  // Snapshot of "last read" at the moment this screen opened, used to find @mentions that were
  // still unread when the user arrived (markRead fires immediately after, so we can't rely on
  // the live value to know what was unread "before").
  const initialLastReadAtRef = useRef<string | null>(null);
  const initialLastReadAtCapturedRef = useRef(false);
  useEffect(() => {
    if (!initialLastReadAtCapturedRef.current && conversation) {
      initialLastReadAtRef.current = conversation.participants.find((p) => p.userId === user?.id)?.lastReadAt ?? null;
      initialLastReadAtCapturedRef.current = true;
    }
  }, [conversation, user?.id]);

  const getAuthorName = (senderId: string) => {
    if (senderId === user?.id) return "Siz";
    return contactAliases[senderId] ?? conversation?.participants.find((p) => p.userId === senderId)?.user.displayName ?? "";
  };

  const onReplyPreviewPress = (replyPreview: ReplyPreview) => {
    if (replyPreview.deletedAt) {
      Alert.alert("Xabar o'chirilgan", "Bu xabar o'chirilgan");
      return;
    }
    navigation.setParams({ highlightMessageId: replyPreview.id });
  };

  const formatActivityLabel = (userIds: Set<string> | undefined, suffix: string): string | null => {
    if (!userIds || userIds.size === 0) return null;
    const names = Array.from(userIds).map(getAuthorName).filter(Boolean);
    if (names.length === 0) return null;
    if (names.length === 1) return `${names[0]} ${suffix}`;
    if (names.length === 2) return `${names[0]} va ${names[1]} ${suffix}`;
    return `${names[0]}, ${names[1]} va yana ${names.length - 2} kishi ${suffix}`;
  };

  const myRole = conversation?.participants.find((p) => p.userId === user?.id)?.role;
  const isGroupLike = conversation?.type === "GROUP" || conversation?.type === "CHANNEL";
  const canMentionEveryone = !conversation || !isGroupLike || myRole === "OWNER" || myRole === "ADMIN";
  const adminIds = (conversation?.participants ?? [])
    .filter((p) => p.role !== "MEMBER" && p.userId !== user?.id)
    .map((p) => p.userId);
  const canMentionAdmins = isGroupLike && adminIds.length > 0;
  const canForwardOrCopy =
    !conversation ||
    !conversation.noForwards ||
    (isGroupLike && (myRole === "OWNER" || myRole === "ADMIN"));
  const canManagePins =
    !conversation ||
    !isGroupLike ||
    myRole === "OWNER" ||
    myRole === "ADMIN" ||
    conversation.membersCanPinMessages;

  const mentionSuggestions =
    mentionQuery !== null
      ? [
          ...(canMentionEveryone && EVERYONE_MENTION.slice(1).startsWith(mentionQuery.toLowerCase())
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
          ...(canMentionAdmins && ADMIN_MENTION.slice(1).startsWith(mentionQuery.toLowerCase())
            ? [
                {
                  key: "admins",
                  username: ADMIN_MENTION.slice(1),
                  label: ADMIN_MENTION,
                  name: "Guruh adminlari",
                  avatarUrl: null as string | null,
                  userIds: adminIds,
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
  const activePinned = pinnedMessages.length > 0 ? pinnedMessages[pinnedIndex % pinnedMessages.length] : null;
  const pinnedPreview = activePinned && conversationKey ? decryptReplyPreview(conversationKey, activePinned) : null;

  const onPinnedBarPress = () => {
    if (!activePinned) return;
    navigation.setParams({ highlightMessageId: activePinned.id });
    if (pinnedMessages.length > 1) {
      setPinnedIndex((i) => (i + 1) % pinnedMessages.length);
    }
  };

  const onUnpinLatest = () => {
    if (!activePinned) return;
    const messageId = activePinned.id;
    Alert.alert("Qadalgan xabar", "Xabarni qadashdan olib tashlansinmi?", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "Olib tashlash", style: "destructive", onPress: () => unpinMessage(conversationId, messageId).catch(() => {}) },
    ]);
  };

  const trimmedSearchQuery = searchQuery.trim().toLowerCase();
  const searchActive = trimmedSearchQuery.length > 0 || searchTypeFilter !== "ALL";
  const searchResults = searchActive
    ? messages
        .filter(
          (m) =>
            !m.deletedAt &&
            !m.decryptFailed &&
            (!searchSenderId || m.senderId === searchSenderId) &&
            (searchTypeFilter === "ALL" ? m.type === "TEXT" : m.type === searchTypeFilter) &&
            (!trimmedSearchQuery || (m.text ?? "").toLowerCase().includes(trimmedSearchQuery))
        )
        .reverse()
    : [];

  const searchableSenders = useMemo(() => {
    if (conversation?.type !== "GROUP") return [];
    const seen = new Map<string, { id: string; displayName: string; avatarUrl: string | null }>();
    for (const m of messages) {
      if (m.type !== "TEXT" || m.deletedAt || m.decryptFailed) continue;
      if (seen.has(m.senderId)) continue;
      const participant = conversation?.participants.find((p) => p.userId === m.senderId);
      if (!participant) continue;
      seen.set(m.senderId, {
        id: m.senderId,
        displayName: getAuthorName(m.senderId) || participant.user.displayName,
        avatarUrl: participant.user.avatarUrl,
      });
    }
    return [...seen.values()];
  }, [messages, conversation?.type, conversation?.participants, contactAliases]);

  const onLoadMoreSearchResults = async () => {
    if (searchLoadingMore || !hasMore) return;
    setSearchLoadingMore(true);
    await loadOlderMessages(conversationId).catch(() => {});
    setSearchLoadingMore(false);
  };

  const onHashtagPress = (tag: string) => {
    setSearchSenderId(null);
    setSearchQuery(tag);
    setSearchVisible(true);
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

  const onJumpToDate = async (day: number) => {
    const targetEndOfDay = new Date(dateJumpMonth.getFullYear(), dateJumpMonth.getMonth(), day, 23, 59, 59, 999);
    setDateJumpSearching(true);
    try {
      for (let attempt = 0; attempt < 20; attempt++) {
        const state = useChatStore.getState();
        const current = state.messagesByConversation[conversationId] ?? [];
        let match: DecryptedMessage | undefined;
        for (let i = current.length - 1; i >= 0; i--) {
          if (new Date(current[i].createdAt) <= targetEndOfDay) {
            match = current[i];
            break;
          }
        }
        if (match) {
          setDateJumpVisible(false);
          setSearchVisible(false);
          setSearchQuery("");
          const index = [...current].reverse().findIndex((m) => m.id === match!.id);
          if (index >= 0) {
            setTimeout(() => listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.4 }), 100);
          }
          setHighlightedMessageId(match.id);
          setTimeout(() => setHighlightedMessageId((id) => (id === match!.id ? null : id)), 1500);
          return;
        }
        if (!state.hasMoreByConversation[conversationId]) break;
        await loadOlderMessages(conversationId);
      }
      Alert.alert("Topilmadi", "Bu sana yoki undan oldingi xabarlar topilmadi");
    } finally {
      setDateJumpSearching(false);
    }
  };

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const dateJumpYear = dateJumpMonth.getFullYear();
  const dateJumpMonthIndex = dateJumpMonth.getMonth();
  const dateJumpDaysInMonth = new Date(dateJumpYear, dateJumpMonthIndex + 1, 0).getDate();
  const dateJumpFirstWeekday = (new Date(dateJumpYear, dateJumpMonthIndex, 1).getDay() + 6) % 7;
  const dateJumpCells: (number | null)[] = [
    ...Array.from({ length: dateJumpFirstWeekday }, () => null),
    ...Array.from({ length: dateJumpDaysInMonth }, (_, i) => i + 1),
  ];
  const dateJumpNowDate = new Date();
  const canGoNextMonth =
    dateJumpYear < dateJumpNowDate.getFullYear() ||
    (dateJumpYear === dateJumpNowDate.getFullYear() && dateJumpMonthIndex < dateJumpNowDate.getMonth());

  const onSend = async (scheduledFor?: string, silent?: boolean, sendWhenOnline?: boolean) => {
    const trimmed = text.trim();
    const isMediaCaptionEdit = !!editingMessage && editingMessage.type !== "TEXT";
    if (!trimmed && !isMediaCaptionEdit) return;
    const mentions = pendingMentions.filter((id) => {
      if (trimmed.includes(EVERYONE_MENTION)) return true;
      if (trimmed.includes(ADMIN_MENTION) && adminIds.includes(id)) return true;
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
        Alert.alert("Xatolik", message ?? "Xabarni tahrirlab bo'lmadi. Internet aloqasini tekshiring");
      }
      return;
    }

    const replyToId = replyingTo?.id;
    setText("");
    setReplyingTo(null);
    setPendingMentions([]);
    setTyping(conversationId, false);
    try {
      await sendTextMessage(
        conversationId,
        trimmed,
        replyToId,
        mentions.length > 0 ? mentions : undefined,
        scheduledFor,
        silent,
        sendWhenOnline
      );
      if (sendWhenOnline) {
        Alert.alert("Rejalashtirildi", "Foydalanuvchi onlayn bo'lganda xabar yuboriladi");
      } else if (scheduledFor) {
        Alert.alert("Rejalashtirildi", "Xabar belgilangan vaqtda yuboriladi");
      } else {
        scrollToLatest();
      }
    } catch (err: any) {
      setText(trimmed);
      const message = err?.response?.data?.error?.message;
      Alert.alert("Xatolik", message ?? "Xabar yuborilmadi. Internet aloqasini tekshiring");
    }
  };

  const canSendWhenOnline = conversation?.type === "DIRECT" && !conversation?.isSelf && !isOtherOnline;

  const onSendOptions = () => {
    if (!text.trim() || editingMessage) return;
    Alert.alert(
      "Yuborish parametrlari",
      "Xabarni qanday yuborish kerak?",
      [
        { text: "Ovozsiz yuborish", onPress: () => onSend(undefined, true) },
        ...SCHEDULE_OPTIONS.map((option) => ({
          text: option.label,
          onPress: () => onSend(option.getDate().toISOString()),
        })),
        ...(canSendWhenOnline
          ? [{ text: "🟢 Onlayn bo'lganda yuborish", onPress: () => onSend(undefined, undefined, true) }]
          : []),
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

  const onShowEditHistory = async (item: DecryptedMessage) => {
    setEditHistoryMessage(item);
    setEditHistoryEntries([]);
    if (!conversationKey) return;
    setLoadingEditHistory(true);
    try {
      const history = await chatsApi.getEditHistory(conversationId, item.id);
      setEditHistoryEntries(
        history.map((h) => ({ text: decryptMessage(h.ciphertext, h.nonce, conversationKey), editedAt: h.editedAt }))
      );
    } catch {
      setEditHistoryEntries([]);
    } finally {
      setLoadingEditHistory(false);
    }
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

  const onMentionAdmins = () => {
    setText((prev) => {
      const needsSpace = prev.length > 0 && !/\s$/.test(prev);
      return `${prev}${needsSpace ? " " : ""}${ADMIN_MENTION} `;
    });
    setPendingMentions((prev) => Array.from(new Set([...prev, ...adminIds])));
    setMentionPickerVisible(false);
  };

  const onChangeText = (value: string) => {
    setText(value);
    setTyping(conversationId, value.length > 0);
    if (isGroupLike) {
      const match = value.match(/(?:^|\s)@(\w*)$/);
      setMentionQuery(match ? match[1] : null);
    }
  };

  const onShowFormatHelp = () => {
    Alert.alert(
      "Matnni formatlash",
      "Xabar matnida belgilarni qo'llash mumkin:\n\n*qalin*\n_kursiv_\n~chizilgan~\n`kod`\n||spoiler||\n\nYoki matnni belgilang — formatlash tugmalari paydo bo'ladi."
    );
  };

  // Wraps the currently selected text with formatting markers (e.g. *bold*, _italic_).
  const onFormatSelection = (open: string, close: string = open) => {
    const { start, end } = selection;
    if (start === end) return;
    const before = text.slice(0, start);
    const selected = text.slice(start, end);
    const after = text.slice(end);
    setText(`${before}${open}${selected}${close}${after}`);
    setSelection({ start: 0, end: 0 });
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (result.canceled || result.assets.length === 0) return;

    const items: PendingMediaItem[] = result.assets.map((asset, i) => ({
      uri: asset.uri,
      name: asset.fileName ?? `photo-${Date.now()}-${i}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
      width: asset.width,
      height: asset.height,
      type: "IMAGE",
    }));

    setMediaCaption("");
    setPendingMedia(items[0]);
    setPendingMediaQueue(items.slice(1));
    setPendingMediaTotal(items.length);
  };

  const pickImageAsFile = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Ruxsat kerak", "Rasm yuborish uchun galereyaga ruxsat bering");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });
    if (result.canceled || result.assets.length === 0) return;

    const items: PendingMediaItem[] = result.assets.map((asset, i) => ({
      uri: asset.uri,
      name: asset.fileName ?? `IMG-${Date.now()}-${i}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
      width: asset.width,
      height: asset.height,
      type: "FILE",
      isUncompressedImage: true,
    }));

    setMediaCaption("");
    setPendingMedia(items[0]);
    setPendingMediaQueue(items.slice(1));
    setPendingMediaTotal(items.length);
  };

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Ruxsat kerak", "Video yuborish uchun galereyaga ruxsat bering");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });
    if (result.canceled || result.assets.length === 0) return;

    const items: PendingMediaItem[] = result.assets.map((asset, i) => ({
      uri: asset.uri,
      name: asset.fileName ?? `video-${Date.now()}-${i}.mp4`,
      mimeType: asset.mimeType ?? "video/mp4",
      width: asset.width,
      height: asset.height,
      duration: asset.duration ?? undefined,
      type: "VIDEO",
    }));

    setMediaCaption("");
    setPendingMedia(items[0]);
    setPendingMediaQueue(items.slice(1));
    setPendingMediaTotal(items.length);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Ruxsat kerak", "Rasm olish uchun kameraga ruxsat bering");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.6,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];

    setPendingMedia({
      uri: asset.uri,
      name: asset.fileName ?? `camera-${Date.now()}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
      width: asset.width,
      height: asset.height,
      type: "IMAGE",
    });
    setPendingMediaQueue([]);
    setPendingMediaTotal(1);
    setMediaCaption("");
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true, multiple: true });
    if (result.canceled || result.assets.length === 0) return;

    const items: PendingMediaItem[] = result.assets.map((asset) => ({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? "application/octet-stream",
      type: "FILE",
    }));

    setMediaCaption("");
    setPendingMedia(items[0]);
    setPendingMediaQueue(items.slice(1));
    setPendingMediaTotal(items.length);
  };

  const pasteImage = async () => {
    const hasImage = await Clipboard.hasImageAsync();
    if (!hasImage) {
      Alert.alert("Bo'sh", "Klipbordda rasm topilmadi");
      return;
    }
    const image = await Clipboard.getImageAsync({ format: "png" });
    if (!image) return;

    const base64 = image.data.split(",")[1] ?? "";
    const fileUri = `${FileSystem.cacheDirectory}clipboard-${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

    setMediaCaption("");
    setPendingMedia({
      uri: fileUri,
      name: `clipboard-${Date.now()}.png`,
      mimeType: "image/png",
      width: image.size.width,
      height: image.size.height,
      type: "IMAGE",
    });
    setPendingMediaQueue([]);
    setPendingMediaTotal(1);
  };

  const cancelPendingMedia = () => {
    setPendingMedia(null);
    setPendingMediaQueue([]);
    setPendingMediaTotal(0);
    setMediaSpoiler(false);
    setMediaUploadProgress(null);
  };

  const sendPendingMedia = async (viewOnce: boolean) => {
    if (!pendingMedia) return;
    const { type, ...asset } = pendingMedia;
    const caption = mediaCaption.trim();
    const replyToId = replyingTo?.id;
    const queue = pendingMediaQueue;
    const isSpoiler = mediaSpoiler;
    setReplyingTo(null);
    setMediaCaption("");
    setMediaSpoiler(false);
    setSending(true);
    setMediaUploadProgress(0);
    try {
      await sendMediaMessage(
        conversationId,
        asset,
        type,
        replyToId,
        viewOnce,
        caption || undefined,
        isSpoiler,
        setMediaUploadProgress
      );
      scrollToLatest();
      if (queue.length > 0) {
        setPendingMedia(queue[0]);
        setPendingMediaQueue(queue.slice(1));
      } else {
        setPendingMedia(null);
        setPendingMediaTotal(0);
      }
    } catch (err: any) {
      cancelPendingMedia();
      Alert.alert(
        "Xatolik",
        err?.response?.data?.error?.message ?? (type === "IMAGE" ? "Rasmni yuborib bo'lmadi" : "Faylni yuborib bo'lmadi")
      );
    } finally {
      setSending(false);
      setMediaUploadProgress(null);
    }
  };

  const sendLocationMessage = useChatStore((s) => s.sendLocationMessage);
  const onShareLocation = async () => {
    try {
      const Location = require("expo-location");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Ruxsat berilmadi", "Joylashuvni aniqlash uchun ruxsat bering");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = loc.coords;
      const replyToId = replyingTo?.id;
      setReplyingTo(null);
      await sendLocationMessage(conversationId, latitude, longitude, `📍 ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`, replyToId);
    } catch {
      Alert.alert("Xatolik", "Joylashuvni aniqlash imkonsiz");
    }
  };

  const onAttach = () => {
    if (!canSendMedia) {
      Alert.alert("Cheklangan", "Bu guruhda a'zolar faqat matnli xabar yuborishi mumkin");
      return;
    }
    Alert.alert("Yuborish", "Nimani yubormoqchisiz?", [
      { text: "📷 Kameradan rasm", onPress: takePhoto },
      { text: "🖼 Rasm", onPress: pickImage },
      { text: "🎬 Video", onPress: pickVideo },
      { text: "🖼 Rasm (siqilmagan, fayl sifatida)", onPress: pickImageAsFile },
      { text: "📄 Fayl", onPress: pickFile },
      { text: "👤 Kontakt", onPress: () => navigation.navigate("ShareContact", { conversationId }) },
      {
        text: "📊 So'rovnoma",
        onPress: () => {
          if (!canSendPolls) {
            Alert.alert("Cheklangan", "Bu guruhda a'zolar so'rovnoma yarata olmaydi");
            return;
          }
          openPollModal();
        },
      },
      {
        text: "🙂 Stiker",
        onPress: () => {
          setActiveStickerPackIndex(recentStickers.length > 0 ? -1 : 0);
          setStickerPickerVisible(true);
        },
      },
      { text: "📍 Joylashuv", onPress: onShareLocation },
      { text: "💬 Tezkor javob", onPress: onOpenQuickReplies },
      { text: "📋 Klipborddan rasm", onPress: pasteImage },
      { text: "Bekor qilish", style: "cancel" },
    ]);
  };

  const onSendSticker = async (sticker: string) => {
    setStickerPickerVisible(false);
    recordSticker(sticker).catch(() => {});
    const replyToId = replyingTo?.id;
    setReplyingTo(null);
    try {
      await sendTextMessage(conversationId, sticker, replyToId);
      scrollToLatest();
    } catch (err: any) {
      const message = err?.response?.data?.error?.message;
      Alert.alert("Xatolik", message ?? "Xabar yuborilmadi. Internet aloqasini tekshiring");
    }
  };

  const onOpenQuickReplies = () => {
    if (quickReplies.length === 0) {
      navigation.navigate("QuickReplies");
      return;
    }
    setQuickReplyPickerVisible(true);
  };

  const onSelectQuickReply = (replyText: string) => {
    setQuickReplyPickerVisible(false);
    onChangeText(text ? `${text}\n${replyText}` : replyText);
  };

  const openPollModal = () => {
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollMultipleChoice(false);
    setPollAnonymous(false);
    setPollQuiz(false);
    setPollCorrectIndex(null);
    setPollQuizExplanation("");
    setPollDeadlineSeconds(null);
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
    setPollCorrectIndex((prev) => {
      if (prev === null || prev === index) return null;
      return prev > index ? prev - 1 : prev;
    });
  };

  const onToggleQuiz = (value: boolean) => {
    setPollQuiz(value);
    if (value) setPollMultipleChoice(false);
    else setPollCorrectIndex(null);
  };

  const onPickPollDeadline = () => {
    Alert.alert(
      "Yopilish vaqti",
      "So'rovnoma avtomatik yopiladigan vaqtni tanlang",
      POLL_DEADLINE_OPTIONS.map((option) => ({
        text: option.label,
        onPress: () => setPollDeadlineSeconds(option.value),
      }))
    );
  };

  const onSubmitPoll = async () => {
    const question = pollQuestion.trim();
    const trimmedOptions = pollOptions.map((o) => o.trim());
    const options = trimmedOptions.filter((o) => o.length > 0);
    if (!question || options.length < 2) return;

    let quizCorrectOptionIndex: number | undefined;
    if (pollQuiz) {
      if (pollCorrectIndex === null || !trimmedOptions[pollCorrectIndex]) return;
      quizCorrectOptionIndex = trimmedOptions.slice(0, pollCorrectIndex).filter((o) => o.length > 0).length;
    }

    setPollModalVisible(false);
    try {
      await sendPollMessage(
        conversationId,
        question,
        options,
        pollQuiz ? false : pollMultipleChoice,
        pollAnonymous,
        undefined,
        quizCorrectOptionIndex,
        pollDeadlineSeconds ?? undefined,
        pollQuiz ? pollQuizExplanation.trim() || undefined : undefined
      );
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

  const sendRecording = async (viewOnce: boolean) => {
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
        replyToId,
        viewOnce
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

  const lastTapRef = useRef<{ id: string; time: number } | null>(null);

  const onPressMessage = (item: DecryptedMessage) => {
    if (selectionMode) {
      if (!item.deletedAt) toggleSelected(item.id);
      return;
    }
    if (item.deletedAt || item.type === "SYSTEM") return;

    const now = Date.now();
    const last = lastTapRef.current;
    if (last && last.id === item.id && now - last.time < 300) {
      lastTapRef.current = null;
      if (conversation?.reactionsEnabled !== false && !item.viewOnce) {
        toggleReaction(conversationId, item.id, quickReactionEmoji).catch(() => {});
      }
      return;
    }
    lastTapRef.current = { id: item.id, time: now };
  };

  const onSetQuickReaction = (emoji: string) => {
    if (emoji === quickReactionEmoji) return;
    setQuickReactionEmoji(emoji).catch(() => {});
    recordEmoji(emoji).catch(() => {});
    Alert.alert("Tezkor reaksiya o'rnatildi", `Endi xabarni ikki marta bosganda ${emoji} reaksiyasi qo'yiladi.`);
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

  const canSend = !isGroupLike || !conversation?.onlyAdminsCanSend || myRole === "OWNER" || myRole === "ADMIN";
  const canSendMedia =
    !isGroupLike || conversation?.membersCanSendMedia !== false || myRole === "OWNER" || myRole === "ADMIN";
  const canSendPolls =
    !isGroupLike || conversation?.membersCanSendPolls !== false || myRole === "OWNER" || myRole === "ADMIN";

  const slowModeSeconds = isGroupLike && myRole === "MEMBER" ? conversation?.slowModeSeconds ?? 0 : 0;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!slowModeSeconds) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [slowModeSeconds]);
  const lastOwnMessage = slowModeSeconds
    ? [...messages].reverse().find((m) => m.senderId === user?.id && !m.deletedAt && !m.scheduledFor)
    : undefined;
  const slowModeRemaining = lastOwnMessage
    ? Math.max(0, slowModeSeconds - Math.floor((now - new Date(lastOwnMessage.createdAt).getTime()) / 1000))
    : 0;

  const unreadMentions =
    isGroupLike && initialLastReadAtCapturedRef.current
      ? messages.filter(
          (m) =>
            m.mentions.includes(user?.id ?? "") &&
            m.senderId !== user?.id &&
            !viewedMentionIds.has(m.id) &&
            (!initialLastReadAtRef.current || new Date(m.createdAt) > new Date(initialLastReadAtRef.current))
        )
      : [];

  const onJumpToMention = () => {
    const next = unreadMentions[0];
    if (!next) return;
    setViewedMentionIds((prev) => new Set(prev).add(next.id));
    navigation.setParams({ highlightMessageId: next.id });
  };

  // The oldest incoming message that was still unread when this screen opened, used to
  // render a "new messages" separator above it (markRead fires immediately, so we rely
  // on the frozen initialLastReadAtRef snapshot rather than the live value).
  const firstUnreadMessageId =
    initialLastReadAtCapturedRef.current && initialLastReadAtRef.current
      ? messages.find(
          (m) => m.senderId !== user?.id && new Date(m.createdAt) > new Date(initialLastReadAtRef.current!)
        )?.id ?? null
      : null;

  const renderItem = ({ item, index }: { item: DecryptedMessage; index: number }) => {
    const previousItem = invertedData[index + 1];
    const showDateSeparator =
      !previousItem || new Date(item.createdAt).toDateString() !== new Date(previousItem.createdAt).toDateString();
    const dateSeparator = showDateSeparator ? (
      <View style={styles.dateSeparatorRow}>
        <Text style={styles.dateSeparatorText}>{formatDateSeparator(item.createdAt)}</Text>
      </View>
    ) : null;
    const unreadSeparator =
      item.id === firstUnreadMessageId ? (
        <View style={styles.unreadSeparatorRow}>
          <View style={styles.unreadSeparatorLine} />
          <Text style={styles.unreadSeparatorText}>Yangi xabarlar</Text>
          <View style={styles.unreadSeparatorLine} />
        </View>
      ) : null;

    if (item.type === "SYSTEM") {
      return (
        <>
          {dateSeparator}
          {unreadSeparator}
          <View style={styles.systemMessageRow}>
            <Text style={styles.systemMessageText}>{item.text}</Text>
          </View>
        </>
      );
    }

    const isOwn = item.senderId === user?.id;
    const senderParticipant = conversation?.participants.find((p) => p.userId === item.senderId);
    const sender = senderParticipant?.user;
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
      content = (
        <MediaImageBubble message={item} conversationKey={conversationKey} onOpenViewer={() => setGalleryMessageId(item.id)} />
      );
    } else if (item.type === "AUDIO" && item.viewOnce && conversationKey) {
      content = (
        <ViewOnceAudioBubble
          message={item}
          conversationKey={conversationKey}
          conversationId={conversationId}
          isOwn={isOwn}
          canView={!item.viewedAt && (!isOwn || !!conversation?.isSelf)}
        />
      );
    } else if (item.type === "AUDIO" && conversationKey) {
      content = <MediaAudioBubble message={item} conversationKey={conversationKey} />;
    } else if (item.type === "VIDEO" && item.viewOnce && conversationKey) {
      content = (
        <ViewOnceVideoBubble
          message={item}
          conversationKey={conversationKey}
          conversationId={conversationId}
          isOwn={isOwn}
          canView={!item.viewedAt && (!isOwn || !!conversation?.isSelf)}
        />
      );
    } else if (item.type === "VIDEO" && conversationKey) {
      content = <MediaVideoBubble message={item} conversationKey={conversationKey} />;
    } else if (item.type === "FILE" && conversationKey) {
      content = <MediaFileBubble message={item} conversationKey={conversationKey} />;
    } else if (item.type === "CONTACT") {
      content = <ContactCardBubble message={item} navigation={navigation} />;
    } else if (item.type === "POLL") {
      content = <PollBubble message={item} conversationId={conversationId} onShowVotes={() => setPollVotesMessage(item)} />;
    } else if (item.type === "LOCATION" && item.latitude != null && item.longitude != null) {
      const mapUrl = `https://tile.openstreetmap.org/${15}/${Math.floor(((item.longitude + 180) / 360) * Math.pow(2, 15))}/${Math.floor((1 - Math.log(Math.tan((item.latitude * Math.PI) / 180) + 1 / Math.cos((item.latitude * Math.PI) / 180)) / Math.PI) / 2 * Math.pow(2, 15))}.png`;
      content = (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => Linking.openURL(`https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=16/${item.latitude}/${item.longitude}`)}
          style={styles.locationBubble}
        >
          <Image source={{ uri: mapUrl }} style={styles.locationMap} resizeMode="cover" />
          <View style={styles.locationPin}>
            <Text style={{ fontSize: 22 }}>📍</Text>
          </View>
          <View style={styles.locationInfo}>
            <Text style={[styles.locationLabel, isOwn && { color: "#fff" }]} numberOfLines={1}>
              {item.text || "Joylashuv"}
            </Text>
            <Text style={[styles.locationCoords, isOwn && { color: "rgba(255,255,255,0.7)" }]}>
              {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
            </Text>
          </View>
        </TouchableOpacity>
      );
    } else if (isSticker) {
      content = <Text style={styles.stickerText}>{item.text}</Text>;
    } else {
      content = renderMessageText(item.text ?? "", conversation?.participants ?? [], fontScale, navigation, onHashtagPress);
    }

    const linkUrl =
      !item.deletedAt && !item.decryptFailed && item.type === "TEXT" ? extractFirstUrl(item.text ?? "") : null;

    const selected = selectedIds.has(item.id);

    return (
      <>
        {dateSeparator}
        {unreadSeparator}
        <SwipeableMessageRow
          enabled={!selectionMode && !item.deletedAt}
          onSwipeReply={() => setReplyingTo(item)}
        >
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
          {isGroupLike && !isOwn && sender && (
            <TouchableOpacity onPress={() => navigation.navigate("UserProfile", { userId: sender.id })}>
              <Text style={styles.senderName}>
                {contactAliases[sender.id] ?? sender.displayName}
                {senderParticipant?.customTitle && <Text style={styles.senderTitle}> · {senderParticipant.customTitle}</Text>}
              </Text>
            </TouchableOpacity>
          )}
          {(item.forwardedFromName || item.forwardCount > 0) && !item.deletedAt && (
            <Text
              style={styles.forwardedLabel}
              onPress={
                item.forwardCount <= 1 && item.forwardedFromUserId && item.forwardedFromUserId !== user?.id
                  ? () => navigation.navigate("UserProfile", { userId: item.forwardedFromUserId! })
                  : undefined
              }
            >
              {item.forwardCount > 1 || !item.forwardedFromName
                ? "↪ Ko'p marta yo'naltirilgan"
                : `↪ Yo'naltirilgan: ${item.forwardedFromName}`}
            </Text>
          )}
          {item.replyPreview && (
            <TouchableOpacity style={styles.replyBox} activeOpacity={0.6} onPress={() => onReplyPreviewPress(item.replyPreview!)}>
              <View style={styles.replyBar} />
              <View style={styles.replyContent}>
                <Text style={styles.replyAuthor} numberOfLines={1}>
                  {getAuthorName(item.replyPreview.senderId)}
                </Text>
                <Text style={styles.replyText} numberOfLines={1}>
                  {getPreviewLabel(item.replyPreview)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          {content}
          {translations[item.id] && (
            <View style={styles.translationBox}>
              <Text style={styles.translationLabel}>Tarjima:</Text>
              <Text style={styles.translationText}>{translations[item.id]}</Text>
              <TouchableOpacity onPress={() => setTranslations((prev) => { const next = { ...prev }; delete next[item.id]; return next; })} hitSlop={8}>
                <Text style={styles.translationDismiss}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {translatingId === item.id && (
            <View style={styles.translationBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.translationLabel}> Tarjima qilinmoqda...</Text>
            </View>
          )}
          {!item.deletedAt &&
            !item.decryptFailed &&
            !!item.text &&
            (item.type === "FILE" || (item.type === "IMAGE" && !item.viewOnce) || item.type === "VIDEO") && (
              <View style={styles.mediaCaption}>
                {renderMessageText(item.text, conversation?.participants ?? [], fontScale, navigation, onHashtagPress)}
              </View>
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
                {isMessageRead(item, otherParticipant) || isMessageDelivered(item, otherParticipant) ? "✓✓" : "✓"}
              </Text>
            )}
          </View>
        </View>
        </TouchableOpacity>
        </SwipeableMessageRow>
      </>
    );
  };

  const typingCount = typingUsers?.size ?? 0;
  const recordingCount = recordingUsers?.size ?? 0;
  const invertedData = [...messages].reverse();
  const galleryImages = messages.filter((m) => m.type === "IMAGE" && !m.viewOnce && !m.deletedAt && !m.decryptFailed);

  return (
    <>
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: customWallpaperUri ? "transparent" : wallpaperColor }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      {customWallpaperUri && (
        <Image source={{ uri: customWallpaperUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      {pinnedPreview && (
        <TouchableOpacity style={styles.pinnedBar} onPress={onPinnedBarPress}>
          <Text style={styles.pinnedIcon}>📌</Text>
          <View style={styles.replyContent}>
            <Text style={styles.replyAuthor} numberOfLines={1}>
              {getAuthorName(pinnedPreview.senderId)}
              {pinnedMessages.length > 1 ? ` · ${(pinnedIndex % pinnedMessages.length) + 1}/${pinnedMessages.length}` : ""}
            </Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {getPreviewLabel(pinnedPreview)}
            </Text>
            {activePinned && activePinned.pinnedBy !== activePinned.senderId && (
              <Text style={styles.pinnedExpiry} numberOfLines={1}>
                {`Qadagan: ${getAuthorName(activePinned.pinnedBy)}`}
              </Text>
            )}
            {formatPinTimeRemaining(activePinned?.expiresAt ?? null) && (
              <Text style={styles.pinnedExpiry}>{formatPinTimeRemaining(activePinned?.expiresAt ?? null)}</Text>
            )}
          </View>
          {pinnedMessages.length > 1 && (
            <TouchableOpacity onPress={() => navigation.navigate("PinnedMessages", { conversationId, title })} hitSlop={8}>
              <Text style={styles.pinnedListIcon}>☰</Text>
            </TouchableOpacity>
          )}
          {canManagePins && (
            <TouchableOpacity onPress={onUnpinLatest} hitSlop={8}>
              <Text style={styles.pinnedClose}>✕</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      )}
      {securityCodeChanged && !keyChangeBannerDismissed && otherUser && (
        <TouchableOpacity
          style={styles.keyChangeBanner}
          onPress={() => navigation.navigate("EncryptionKey", { userId: otherUser.id, displayName: otherUserDisplayName })}
        >
          <Text style={styles.keyChangeBannerIcon}>⚠️</Text>
          <Text style={styles.keyChangeBannerText} numberOfLines={2}>
            {`${otherUserDisplayName} bilan xavfsizlik kodi o'zgardi. Tekshirish uchun bosing`}
          </Text>
          <TouchableOpacity onPress={() => setKeyChangeBannerDismissed(true)} hitSlop={8}>
            <Text style={styles.keyChangeBannerClose}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
      {isGroupLike && conversation?.description && !descriptionBannerDismissed && (
        <TouchableOpacity
          style={styles.descriptionBanner}
          onPress={() => navigation.navigate("GroupInfo", { conversationId })}
        >
          <Text style={styles.descriptionBannerIcon}>ℹ️</Text>
          <Text style={styles.descriptionBannerText} numberOfLines={2}>
            {conversation.description}
          </Text>
          <TouchableOpacity onPress={() => setDescriptionBannerDismissed(true)} hitSlop={8}>
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
        onScroll={onScroll}
        scrollEventThrottle={100}
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
      {unreadMentions.length > 0 && (
        <TouchableOpacity style={[styles.scrollToBottomButton, styles.mentionButton]} onPress={onJumpToMention}>
          <Text style={styles.scrollToBottomIcon}>@</Text>
          <View style={styles.scrollToBottomBadge}>
            <Text style={styles.scrollToBottomBadgeText}>{unreadMentions.length > 99 ? "99+" : unreadMentions.length}</Text>
          </View>
        </TouchableOpacity>
      )}
      {showScrollToBottom && (
        <TouchableOpacity style={styles.scrollToBottomButton} onPress={onScrollToBottomPress}>
          <Text style={styles.scrollToBottomIcon}>↓</Text>
          {newMessagesCount > 0 && (
            <View style={styles.scrollToBottomBadge}>
              <Text style={styles.scrollToBottomBadgeText}>{newMessagesCount > 99 ? "99+" : newMessagesCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      )}
      {recordingCount > 0 ? (
        <Text style={styles.typing}>🎤 {formatActivityLabel(recordingUsers, "ovozli xabar yozmoqda...")}</Text>
      ) : (
        typingCount > 0 && (
          <View style={styles.typingRow}>
            <Text style={styles.typing}>{formatActivityLabel(typingUsers, "yozmoqda")}</Text>
            <TypingIndicator />
          </View>
        )
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
          <TouchableOpacity style={styles.recordingCancel} onPress={cancelRecording} accessibilityLabel="Yozishni bekor qilish" accessibilityRole="button">
            <Text style={styles.recordingCancelText}>Bekor qilish</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mediaPreviewViewOnce} onPress={() => sendRecording(true)} accessibilityLabel="Bir martalik ovozli xabar" accessibilityRole="button">
            <Text style={styles.mediaPreviewViewOnceText}>🔥</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sendButton} onPress={() => sendRecording(false)} accessibilityLabel="Ovozli xabar yuborish" accessibilityRole="button">
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
          {slowModeRemaining > 0 && (
            <View style={styles.slowModeBar}>
              <Text style={styles.slowModeText}>
                🐢 Sekin rejim: yana {slowModeRemaining} soniyadan keyin xabar yuborishingiz mumkin
              </Text>
            </View>
          )}
          {selection.start !== selection.end && (
            <View style={styles.formatToolbar}>
              <TouchableOpacity style={styles.formatButton} onPress={() => onFormatSelection("*")} accessibilityLabel="Qalin" accessibilityRole="button">
                <Text style={[styles.formatButtonText, styles.boldText]}>B</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.formatButton} onPress={() => onFormatSelection("_")} accessibilityLabel="Kursiv" accessibilityRole="button">
                <Text style={[styles.formatButtonText, styles.italicText]}>I</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.formatButton} onPress={() => onFormatSelection("~")} accessibilityLabel="Chizilgan" accessibilityRole="button">
                <Text style={[styles.formatButtonText, styles.strikeText]}>S</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.formatButton} onPress={() => onFormatSelection("`")} accessibilityLabel="Kod" accessibilityRole="button">
                <Text style={[styles.formatButtonText, styles.codeText]}>{"</>"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.formatButton} onPress={() => onFormatSelection("||")} accessibilityLabel="Spoiler" accessibilityRole="button">
                <Text style={styles.formatButtonText}>🙈</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.attachButton} onPress={onAttach} disabled={sending || !!editingMessage} accessibilityLabel="Fayl biriktirish" accessibilityRole="button">
              {sending ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.attachIcon}>+</Text>}
            </TouchableOpacity>
            {isGroupLike && (
              <TouchableOpacity style={styles.attachButton} onPress={() => setMentionPickerVisible(true)} disabled={sending} accessibilityLabel="Foydalanuvchini eslatish" accessibilityRole="button">
                <Text style={styles.attachIcon}>@</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.attachButton} onPress={onShowFormatHelp} disabled={sending} accessibilityLabel="Matn formatlash" accessibilityRole="button">
              <Text style={styles.formatHelpIcon}>Aa</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={onChangeText}
              onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
              placeholder="Xabar yozing..."
              placeholderTextColor={colors.textSecondary}
              multiline
              accessibilityLabel="Xabar matni"
            />
            {text.trim() || editingMessage ? (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={() => onSend()}
                onLongPress={onSendOptions}
                disabled={!editingMessage && slowModeRemaining > 0}
                accessibilityLabel="Xabar yuborish"
                accessibilityRole="button"
              >
                <Text style={styles.sendText}>Yuborish</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.attachButton}
                onPress={startRecording}
                disabled={sending || !!editingMessage || !canSendMedia}
                accessibilityLabel="Ovozli xabar yozish"
                accessibilityRole="button"
              >
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
          {conversation?.reactionsEnabled !== false && !actionMessage?.viewOnce && (
            <>
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
                    onLongPress={() => onSetQuickReaction(emoji)}
                  >
                    <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
                    {emoji === quickReactionEmoji && <View style={styles.quickReactionBadge} />}
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
              <Text style={styles.quickReactionHint}>Ikki marta bosish uchun reaksiyani uzoq bosib tanlang</Text>
            </>
          )}
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
          {actionMessage &&
            isGroupLike &&
            actionMessage.senderId !== user?.id &&
            actionMessage.type !== "SYSTEM" &&
            canForwardOrCopy &&
            !actionMessage.decryptFailed &&
            !actionMessage.viewOnce &&
            !actionMessage.deletedAt && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={async () => {
                  const message = actionMessage;
                  const senderUser = conversation?.participants.find((p) => p.userId === message.senderId)?.user;
                  setActionMessage(null);
                  if (!senderUser) return;
                  try {
                    const dm = await createDirectConversation(senderUser);
                    await forwardMessage(conversationId, message.id, dm.id, false);
                    const { title } = getConversationDisplay(dm, user?.id ?? "", contactAliases);
                    navigation.navigate("ChatRoom", { conversationId: dm.id, title });
                  } catch {
                    Alert.alert("Xatolik", "Shaxsiy javob yuborib bo'lmadi");
                  }
                }}
              >
                <Text style={styles.actionButtonText}>↪️ Shaxsiy javob</Text>
              </TouchableOpacity>
            )}
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
            canForwardOrCopy &&
            (actionMessage.type === "TEXT" ||
              actionMessage.type === "IMAGE" ||
              actionMessage.type === "VIDEO" ||
              actionMessage.type === "FILE" ||
              actionMessage.type === "AUDIO" ||
              actionMessage.type === "POLL" ||
              actionMessage.type === "CONTACT") &&
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
            canForwardOrCopy &&
            (actionMessage.type === "TEXT" ||
              actionMessage.type === "IMAGE" ||
              actionMessage.type === "VIDEO" ||
              actionMessage.type === "FILE" ||
              actionMessage.type === "AUDIO" ||
              actionMessage.type === "POLL" ||
              actionMessage.type === "CONTACT") &&
            !actionMessage.decryptFailed &&
            !actionMessage.deletedAt &&
            !!actionMessage.text && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  const text = actionMessage.text ?? "";
                  setActionMessage(null);
                  Share.share({ message: text }).catch(() => {});
                }}
              >
                <Text style={styles.actionButtonText}>↗️ Ulashish</Text>
              </TouchableOpacity>
            )}
          {actionMessage &&
            actionMessage.senderId === user?.id &&
            (actionMessage.type === "TEXT" ||
              actionMessage.type === "IMAGE" ||
              actionMessage.type === "VIDEO" ||
              actionMessage.type === "FILE") &&
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
          {actionMessage && actionMessage.editedAt && !actionMessage.deletedAt && !actionMessage.decryptFailed && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                const message = actionMessage;
                setActionMessage(null);
                onShowEditHistory(message);
              }}
            >
              <Text style={styles.actionButtonText}>🕘 Tahrirlash tarixi</Text>
            </TouchableOpacity>
          )}
          {actionMessage &&
            actionMessage.type === "POLL" &&
            (actionMessage.senderId === user?.id || myRole === "OWNER" || myRole === "ADMIN") &&
            !actionMessage.pollClosedAt &&
            !actionMessage.deletedAt && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  const message = actionMessage;
                  setActionMessage(null);
                  Alert.alert("So'rovnomani yopish", "Yopilgandan so'ng ovoz berib bo'lmaydi. Davom etilsinmi?", [
                    { text: "Bekor qilish", style: "cancel" },
                    {
                      text: "Yopish",
                      style: "destructive",
                      onPress: () => closePoll(conversationId, message.id).catch(() => Alert.alert("Xatolik", "So'rovnomani yopib bo'lmadi")),
                    },
                  ]);
                }}
              >
                <Text style={styles.actionButtonText}>🔒 So'rovnomani yopish</Text>
              </TouchableOpacity>
            )}
          {actionMessage && !actionMessage.deletedAt && !actionMessage.viewOnce && (
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
          {actionMessage &&
            !actionMessage.deletedAt &&
            !actionMessage.viewOnce &&
            canManagePins && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  const message = actionMessage;
                  setActionMessage(null);
                  const isPinned = pinnedMessages.some((pm) => pm.id === message.id);
                  if (isPinned) {
                    unpinMessage(conversationId, message.id).catch(() => {});
                    return;
                  }
                  Alert.alert(
                    "Xabarni qadash",
                    "Qadalgan xabar qancha vaqt ko'rsatilishini tanlang",
                    PIN_DURATION_OPTIONS.map((option) => ({
                      text: option.label,
                      onPress: () => {
                        const doPin = (notify: boolean) =>
                          pinMessage(conversationId, message.id, option.value, notify).catch(() => {});
                        if (!isGroupLike) {
                          doPin(true);
                          return;
                        }
                        Alert.alert("Bildirishnoma", "Barcha a'zolarga xabar berilsinmi?", [
                          { text: "Yo'q", onPress: () => doPin(false) },
                          { text: "Ha", onPress: () => doPin(true) },
                        ]);
                      },
                    }))
                  );
                }}
              >
                <Text style={styles.actionButtonText}>
                  {pinnedMessages.some((pm) => pm.id === actionMessage.id) ? "📌 Qadashni bekor qilish" : "📌 Qadash"}
                </Text>
              </TouchableOpacity>
            )}
          {actionMessage && !actionMessage.deletedAt && !actionMessage.viewOnce && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                const message = actionMessage;
                setActionMessage(null);
                Alert.alert(
                  "Yodga solish",
                  "Bu xabar haqida qachon eslatilsin?",
                  REMINDER_DURATION_OPTIONS.map((option) => ({
                    text: option.label,
                    onPress: () =>
                      setReminder(conversationId, message.id, option.value)
                        .then(() => Alert.alert("Yodga solish", "Eslatma o'rnatildi"))
                        .catch(() => Alert.alert("Xatolik", "Eslatmani o'rnatib bo'lmadi")),
                  }))
                );
              }}
            >
              <Text style={styles.actionButtonText}>⏰ Yodga solish</Text>
            </TouchableOpacity>
          )}
          {actionMessage && isGroupLike && actionMessage.senderId === user?.id && !actionMessage.deletedAt && (
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
          {actionMessage &&
            !isGroupLike &&
            !conversation?.isSelf &&
            actionMessage.senderId === user?.id &&
            !actionMessage.deletedAt && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  const message = actionMessage;
                  setActionMessage(null);
                  setMessageInfoMessage(message);
                }}
              >
                <Text style={styles.actionButtonText}>ℹ️ Xabar haqida</Text>
              </TouchableOpacity>
            )}
          {actionMessage && canForwardOrCopy && !actionMessage.decryptFailed && !actionMessage.viewOnce && (
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
          {actionMessage && canForwardOrCopy && !actionMessage.decryptFailed && !actionMessage.viewOnce && !conversation?.isSelf && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={async () => {
                const message = actionMessage;
                setActionMessage(null);
                try {
                  const saved = await getOrCreateSavedMessages();
                  await forwardMessage(conversationId, message.id, saved.id, false);
                  Alert.alert("Yuborildi", "Saqlangan xabarlarga yuborildi");
                } catch {
                  Alert.alert("Xatolik", "Saqlangan xabarlarga yuborib bo'lmadi");
                }
              }}
            >
              <Text style={styles.actionButtonText}>📥 Saqlangan xabarlarga yuborish</Text>
            </TouchableOpacity>
          )}
          {actionMessage &&
            ((actionMessage.senderId === user?.id &&
              Date.now() - new Date(actionMessage.createdAt).getTime() <= RECALL_WINDOW_MS) ||
              ((conversation?.type === "GROUP" || conversation?.type === "CHANNEL") &&
                actionMessage.senderId !== user?.id &&
                actionMessage.type !== "SYSTEM" &&
                (myRole === "OWNER" || myRole === "ADMIN"))) && (
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
            actionMessage.type !== "SYSTEM" &&
            !actionMessage.deletedAt &&
            !conversation?.isBlocked && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  const message = actionMessage;
                  setActionMessage(null);
                  patUser(conversationId, message.senderId).catch(() => {});
                }}
              >
                <Text style={styles.actionButtonText}>👋 Chimchilash</Text>
              </TouchableOpacity>
            )}
          {actionMessage && !actionMessage.deletedAt && !actionMessage.decryptFailed && !!actionMessage.text && actionMessage.type !== "SYSTEM" && !translations[actionMessage.id] && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setPendingTranslateMsg(actionMessage);
                setShowTranslateLangPicker(true);
              }}
            >
              <Text style={styles.actionButtonText}>🌐 Tarjima qilish</Text>
            </TouchableOpacity>
          )}
          {actionMessage && actionMessage.senderId !== user?.id && actionMessage.type !== "SYSTEM" && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                const message = actionMessage;
                setActionMessage(null);
                markRead(conversationId, message.id, message.createdAt).catch(() => {});
              }}
            >
              <Text style={styles.actionButtonText}>📍 Shu yergacha o'qilgan deb belgilash</Text>
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
          {actionMessage && actionMessage.type !== "SYSTEM" && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                const message = actionMessage;
                setActionMessage(null);
                const dateOptions: Intl.DateTimeFormatOptions = {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                };
                let info = `Yuborilgan: ${new Date(message.createdAt).toLocaleString([], dateOptions)}`;
                if (message.editedAt) {
                  info += `\nTahrirlangan: ${new Date(message.editedAt).toLocaleString([], dateOptions)}`;
                }
                Alert.alert("Xabar haqida", info);
              }}
            >
              <Text style={styles.actionButtonText}>ℹ️ Ma'lumot</Text>
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
      onRequestClose={() => {
        setMoreReactionsMessage(null);
        setCustomReactionEmoji("");
      }}
    >
      <Pressable
        style={styles.actionBackdrop}
        onPress={() => {
          setMoreReactionsMessage(null);
          setCustomReactionEmoji("");
        }}
      >
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
                  setCustomReactionEmoji("");
                }}
                onLongPress={() => onSetQuickReaction(emoji)}
              >
                <Text style={styles.reactionPickerEmoji}>{emoji}</Text>
                {emoji === quickReactionEmoji && <View style={styles.quickReactionBadge} />}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.customReactionRow}>
            <TextInput
              style={styles.customReactionInput}
              placeholder="Boshqa emoji..."
              placeholderTextColor={colors.textSecondary}
              value={customReactionEmoji}
              onChangeText={setCustomReactionEmoji}
              maxLength={8}
              returnKeyType="done"
              onSubmitEditing={() => {
                const emoji = customReactionEmoji.trim();
                if (!emoji || !moreReactionsMessage) return;
                toggleReaction(conversationId, moreReactionsMessage.id, emoji).catch(() => {});
                recordEmoji(emoji).catch(() => {});
                setMoreReactionsMessage(null);
                setCustomReactionEmoji("");
              }}
            />
            <TouchableOpacity
              style={[styles.customReactionButton, !customReactionEmoji.trim() && styles.customReactionButtonDisabled]}
              disabled={!customReactionEmoji.trim()}
              onPress={() => {
                const emoji = customReactionEmoji.trim();
                if (!emoji || !moreReactionsMessage) return;
                toggleReaction(conversationId, moreReactionsMessage.id, emoji).catch(() => {});
                recordEmoji(emoji).catch(() => {});
                setMoreReactionsMessage(null);
                setCustomReactionEmoji("");
              }}
              onLongPress={() => {
                const emoji = customReactionEmoji.trim();
                if (emoji) onSetQuickReaction(emoji);
              }}
            >
              <Text style={styles.customReactionButtonText}>✓</Text>
            </TouchableOpacity>
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
    <Modal visible={!!messageInfoMessage} transparent animationType="fade" onRequestClose={() => setMessageInfoMessage(null)}>
      <Pressable style={styles.actionBackdrop} onPress={() => setMessageInfoMessage(null)}>
        <Pressable style={styles.actionSheet}>
          <Text style={styles.mentionPickerTitle}>Xabar haqida</Text>
          {messageInfoMessage && (
            <View style={styles.messageInfoList}>
              <View style={styles.messageInfoRow}>
                <Text style={styles.messageInfoLabel}>Yuborildi</Text>
                <Text style={styles.messageInfoValue}>{formatDateTime(messageInfoMessage.createdAt)}</Text>
              </View>
              <View style={styles.messageInfoRow}>
                <Text style={styles.messageInfoLabel}>Yetkazildi</Text>
                <Text style={styles.messageInfoValue}>
                  {otherParticipant && isMessageDelivered(messageInfoMessage, otherParticipant)
                    ? formatDateTime(otherParticipant.lastDeliveredAt!)
                    : "Hali yo'q"}
                </Text>
              </View>
              <View style={styles.messageInfoRow}>
                <Text style={styles.messageInfoLabel}>O'qildi</Text>
                <Text style={styles.messageInfoValue}>
                  {otherParticipant && isMessageRead(messageInfoMessage, otherParticipant)
                    ? formatDateTime(otherParticipant.lastReadAt!)
                    : "Hali yo'q"}
                </Text>
              </View>
            </View>
          )}
          <TouchableOpacity style={styles.actionButton} onPress={() => setMessageInfoMessage(null)}>
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
      visible={!!pollVotesMessage}
      transparent
      animationType="fade"
      onRequestClose={() => setPollVotesMessage(null)}
    >
      <Pressable style={styles.actionBackdrop} onPress={() => setPollVotesMessage(null)}>
        <Pressable style={styles.actionSheet}>
          <Text style={styles.mentionPickerTitle}>Ovozlar</Text>
          <ScrollView style={styles.seenByList}>
            {pollVotesMessage?.pollMeta?.options.map((option) => {
              const voters = (pollVotesMessage.pollVotes ?? []).filter((v) => v.optionIds.includes(option.id));
              return (
                <View key={option.id}>
                  <Text style={styles.seenBySectionLabel}>
                    {option.text} · {voters.length}
                  </Text>
                  {voters.length === 0 && <Text style={styles.seenByName}>Hali ovoz yo'q</Text>}
                  {voters.map((v) => {
                    const uid = v.userId!;
                    const participant = conversation?.participants.find((p) => p.userId === uid);
                    return (
                      <View key={uid} style={styles.seenByRow}>
                        <Avatar uri={participant?.user.avatarUrl} name={getAuthorName(uid)} size={36} />
                        <Text style={styles.seenByName}>{getAuthorName(uid)}</Text>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={styles.actionButton} onPress={() => setPollVotesMessage(null)}>
            <Text style={styles.actionButtonText}>Yopish</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
    <Modal
      visible={!!editHistoryMessage}
      transparent
      animationType="fade"
      onRequestClose={() => setEditHistoryMessage(null)}
    >
      <Pressable style={styles.actionBackdrop} onPress={() => setEditHistoryMessage(null)}>
        <Pressable style={styles.actionSheet}>
          <Text style={styles.mentionPickerTitle}>Tahrirlash tarixi</Text>
          <ScrollView style={styles.seenByList}>
            {loadingEditHistory ? (
              <ActivityIndicator color={colors.primary} style={styles.editHistoryLoader} />
            ) : (
              <>
                {editHistoryEntries.map((entry, index) => (
                  <View key={index} style={styles.editHistoryRow}>
                    <Text style={styles.editHistoryTime}>
                      {new Date(entry.editedAt).toLocaleString([], {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    <Text style={styles.editHistoryText}>{entry.text}</Text>
                  </View>
                ))}
                {editHistoryMessage && (
                  <View style={styles.editHistoryRow}>
                    <Text style={styles.editHistoryTime}>
                      {new Date(editHistoryMessage.editedAt!).toLocaleString([], {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      (joriy)
                    </Text>
                    <Text style={styles.editHistoryText}>{editHistoryMessage.text}</Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.actionButton} onPress={() => setEditHistoryMessage(null)}>
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
          {canMentionEveryone && (
            <TouchableOpacity style={styles.actionButton} onPress={onMentionEveryone}>
              <Text style={styles.actionButtonText}>
                <Text style={styles.mentionText}>{EVERYONE_MENTION}</Text> (barcha a'zolar)
              </Text>
            </TouchableOpacity>
          )}
          {canMentionAdmins && (
            <TouchableOpacity style={styles.actionButton} onPress={onMentionAdmins}>
              <Text style={styles.actionButtonText}>
                <Text style={styles.mentionText}>{ADMIN_MENTION}</Text> (guruh adminlari)
              </Text>
            </TouchableOpacity>
          )}
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
      visible={quickReplyPickerVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setQuickReplyPickerVisible(false)}
    >
      <Pressable style={styles.actionBackdrop} onPress={() => setQuickReplyPickerVisible(false)}>
        <Pressable style={styles.actionSheet}>
          <Text style={styles.mentionPickerTitle}>Tezkor javob</Text>
          <ScrollView style={styles.seenByList}>
            {quickReplies.map((item) => (
              <TouchableOpacity key={item.id} style={styles.actionButton} onPress={() => onSelectQuickReply(item.text)}>
                <Text style={styles.actionButtonText} numberOfLines={2}>
                  {item.text}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.actionButton} onPress={() => setQuickReplyPickerVisible(false)}>
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
              setDateJumpMonth(new Date());
              setDateJumpVisible(true);
            }}
            hitSlop={8}
          >
            <Text style={styles.searchDateIcon}>📅</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setSearchVisible(false);
              setSearchQuery("");
              setSearchSenderId(null);
              setSearchTypeFilter("ALL");
            }}
            hitSlop={8}
          >
            <Text style={styles.searchClose}>Yopish</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.searchSenderFilterBar}>
          {SEARCH_TYPE_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.type}
              style={[styles.senderChip, searchTypeFilter === filter.type && styles.senderChipActive]}
              onPress={() => setSearchTypeFilter(filter.type)}
            >
              <Text style={[styles.senderChipText, searchTypeFilter === filter.type && styles.senderChipTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {isGroupLike && searchableSenders.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.searchSenderFilterBar}>
            <TouchableOpacity
              style={[styles.senderChip, !searchSenderId && styles.senderChipActive]}
              onPress={() => setSearchSenderId(null)}
            >
              <Text style={[styles.senderChipText, !searchSenderId && styles.senderChipTextActive]}>Hammasi</Text>
            </TouchableOpacity>
            {searchableSenders.map((sender) => (
              <TouchableOpacity
                key={sender.id}
                style={[styles.senderChip, searchSenderId === sender.id && styles.senderChipActive]}
                onPress={() => setSearchSenderId((prev) => (prev === sender.id ? null : sender.id))}
              >
                <Avatar uri={sender.avatarUrl} name={sender.displayName} size={20} />
                <Text
                  style={[styles.senderChipText, searchSenderId === sender.id && styles.senderChipTextActive]}
                  numberOfLines={1}
                >
                  {sender.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.searchResult} onPress={() => onSelectSearchResult(item)}>
              {isGroupLike && (
                <Text style={styles.searchResultAuthor} numberOfLines={1}>
                  {getAuthorName(item.senderId)}
                </Text>
              )}
              <Text style={styles.searchResultText} numberOfLines={2}>
                {highlightMatch(getPreviewLabel(item), trimmedSearchQuery)}
              </Text>
              <Text style={styles.searchResultTime}>{formatTime(item.createdAt)}</Text>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.searchSeparator} />}
          ListFooterComponent={
            searchActive && searchResults.length === 0 && hasMore ? (
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
            searchActive ? (
              <View style={styles.searchEmpty}>
                <Text style={styles.emptyText}>Hech narsa topilmadi</Text>
              </View>
            ) : null
          }
        />
      </View>
    </Modal>
    <Modal
      visible={dateJumpVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setDateJumpVisible(false)}
    >
      <Pressable style={styles.actionBackdrop} onPress={() => setDateJumpVisible(false)}>
        <Pressable style={styles.dateJumpSheet}>
          <View style={styles.dateJumpHeader}>
            <TouchableOpacity
              onPress={() => setDateJumpMonth(new Date(dateJumpYear, dateJumpMonthIndex - 1, 1))}
              hitSlop={8}
            >
              <Text style={styles.dateJumpNav}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.dateJumpTitle}>
              {UZ_MONTHS[dateJumpMonthIndex]} {dateJumpYear}
            </Text>
            <TouchableOpacity
              onPress={() => canGoNextMonth && setDateJumpMonth(new Date(dateJumpYear, dateJumpMonthIndex + 1, 1))}
              disabled={!canGoNextMonth}
              hitSlop={8}
            >
              <Text style={[styles.dateJumpNav, !canGoNextMonth && styles.dateJumpNavDisabled]}>›</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dateJumpWeekdays}>
            {WEEKDAY_LABELS.map((label) => (
              <Text key={label} style={styles.dateJumpWeekday}>
                {label}
              </Text>
            ))}
          </View>
          <View style={styles.dateJumpGrid}>
            {dateJumpCells.map((day, index) => {
              if (day === null) {
                return <View key={`empty-${index}`} style={styles.dateJumpCell} />;
              }
              const isFuture = new Date(dateJumpYear, dateJumpMonthIndex, day) > todayEnd;
              return (
                <TouchableOpacity
                  key={day}
                  style={styles.dateJumpCell}
                  disabled={isFuture || dateJumpSearching}
                  onPress={() => onJumpToDate(day)}
                >
                  <Text style={[styles.dateJumpCellText, isFuture && styles.dateJumpCellTextDisabled]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {dateJumpSearching && <ActivityIndicator color={colors.primary} style={styles.dateJumpLoading} />}
        </Pressable>
      </Pressable>
    </Modal>
    <Modal
      visible={stickerPickerVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setStickerPickerVisible(false)}
    >
      <Pressable style={styles.actionBackdrop} onPress={() => setStickerPickerVisible(false)}>
        <Pressable style={styles.actionSheet}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={styles.mentionPickerTitle}>Stiker tanlang</Text>
            <TouchableOpacity onPress={() => { setStickerPickerVisible(false); onOpenGifPicker(); }} style={{ paddingHorizontal: 12 }}>
              <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 14 }}>GIF</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stickerPackTabs}>
            {recentStickers.length > 0 && (
              <TouchableOpacity
                style={[styles.stickerPackTab, activeStickerPackIndex === -1 && styles.stickerPackTabActive]}
                onPress={() => setActiveStickerPackIndex(-1)}
              >
                <Text style={styles.stickerPackTabIcon}>🕘</Text>
                <Text
                  style={[styles.stickerPackTabText, activeStickerPackIndex === -1 && styles.stickerPackTabTextActive]}
                  numberOfLines={1}
                >
                  Oxirgi
                </Text>
              </TouchableOpacity>
            )}
            {STICKER_PACKS.map((pack, index) => (
              <TouchableOpacity
                key={pack.id}
                style={[styles.stickerPackTab, activeStickerPackIndex === index && styles.stickerPackTabActive]}
                onPress={() => setActiveStickerPackIndex(index)}
              >
                <Text style={styles.stickerPackTabIcon}>{pack.stickers[0]}</Text>
                <Text
                  style={[styles.stickerPackTabText, activeStickerPackIndex === index && styles.stickerPackTabTextActive]}
                  numberOfLines={1}
                >
                  {pack.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.stickerGrid}>
            {(activeStickerPackIndex === -1 ? recentStickers : STICKER_PACKS[activeStickerPackIndex]?.stickers ?? STICKER_PACKS[0].stickers).map(
              (sticker, i) => (
                <TouchableOpacity key={`${sticker}-${i}`} style={styles.stickerOption} onPress={() => onSendSticker(sticker)}>
                  <Text style={styles.stickerEmoji}>{sticker}</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </Pressable>
      </Pressable>
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
          <Text style={styles.pollHeaderTitle}>{pollQuiz ? "Yangi test" : "Yangi so'rovnoma"}</Text>
          <TouchableOpacity
            onPress={onSubmitPoll}
            disabled={
              !pollQuestion.trim() ||
              pollOptions.filter((o) => o.trim()).length < 2 ||
              (pollQuiz && pollCorrectIndex === null)
            }
          >
            <Text
              style={[
                styles.searchClose,
                (!pollQuestion.trim() ||
                  pollOptions.filter((o) => o.trim()).length < 2 ||
                  (pollQuiz && pollCorrectIndex === null)) &&
                  styles.pollSendDisabled,
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
          {pollQuiz && <Text style={styles.pollHint}>To'g'ri javobni belgilash uchun doirachani bosing</Text>}
          {pollOptions.map((option, index) => (
            <View key={index} style={styles.pollOptionRow}>
              {pollQuiz && (
                <TouchableOpacity onPress={() => setPollCorrectIndex(index)} hitSlop={8}>
                  <View style={[styles.pollCorrectRadio, pollCorrectIndex === index && styles.pollCorrectRadioSelected]}>
                    {pollCorrectIndex === index && <Text style={styles.pollCorrectCheck}>✓</Text>}
                  </View>
                </TouchableOpacity>
              )}
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
          {!pollQuiz && (
            <View style={styles.pollSwitchRow}>
              <Text style={styles.pollSwitchLabel}>Bir nechta javob</Text>
              <Switch value={pollMultipleChoice} onValueChange={setPollMultipleChoice} trackColor={{ true: colors.primary }} />
            </View>
          )}
          <View style={styles.pollSwitchRow}>
            <Text style={styles.pollSwitchLabel}>Anonim so'rovnoma</Text>
            <Switch value={pollAnonymous} onValueChange={setPollAnonymous} trackColor={{ true: colors.primary }} />
          </View>
          <View style={styles.pollSwitchRow}>
            <Text style={styles.pollSwitchLabel}>Test rejimi (to'g'ri javob bilan)</Text>
            <Switch value={pollQuiz} onValueChange={onToggleQuiz} trackColor={{ true: colors.primary }} />
          </View>
          {pollQuiz && (
            <>
              <Text style={styles.pollLabel}>Tushuntirish (ixtiyoriy)</Text>
              <TextInput
                style={styles.pollInput}
                value={pollQuizExplanation}
                onChangeText={setPollQuizExplanation}
                placeholder="Javobdan keyin ko'rsatiladigan izoh"
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={300}
              />
            </>
          )}
          <TouchableOpacity style={styles.pollSwitchRow} onPress={onPickPollDeadline}>
            <Text style={styles.pollSwitchLabel}>Yopilish vaqti</Text>
            <Text style={styles.pollDeadlineValue}>{formatPollDeadline(pollDeadlineSeconds)} ›</Text>
          </TouchableOpacity>
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
    <Modal visible={!!pendingMedia} transparent animationType="fade" onRequestClose={cancelPendingMedia}>
      <KeyboardAvoidingView
        style={styles.mediaPreviewBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.mediaPreviewSheet}>
          {pendingMediaTotal > 1 && (
            <Text style={styles.mediaPreviewCounter}>
              {pendingMediaTotal - pendingMediaQueue.length} / {pendingMediaTotal}
            </Text>
          )}
          {pendingMedia?.type === "IMAGE" || pendingMedia?.isUncompressedImage ? (
            <Image source={{ uri: pendingMedia.uri }} style={styles.mediaPreviewImage} resizeMode="contain" />
          ) : (
            <View style={styles.mediaPreviewFile}>
              <Text style={styles.mediaPreviewFileIcon}>{pendingMedia?.type === "VIDEO" ? "🎬" : "📄"}</Text>
              <Text style={styles.mediaPreviewFileName} numberOfLines={2}>
                {pendingMedia?.name}
              </Text>
            </View>
          )}
          {pendingMedia?.isUncompressedImage && (
            <Text style={styles.mediaPreviewFileBadge}>📄 Siqilmagan rasm fayl sifatida yuboriladi</Text>
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
            <TouchableOpacity style={styles.mediaPreviewCancel} onPress={cancelPendingMedia} disabled={sending}>
              <Text style={styles.mediaPreviewCancelText}>Bekor qilish</Text>
            </TouchableOpacity>
            {(pendingMedia?.type === "IMAGE" || pendingMedia?.type === "VIDEO") && (
              <TouchableOpacity
                style={[styles.mediaPreviewSpoiler, mediaSpoiler && styles.mediaPreviewSpoilerActive]}
                onPress={() => setMediaSpoiler((v) => !v)}
                disabled={sending}
              >
                <Text style={styles.mediaPreviewSpoilerText}>🙈</Text>
              </TouchableOpacity>
            )}
            {(pendingMedia?.type === "IMAGE" || pendingMedia?.type === "VIDEO") && (
              <TouchableOpacity
                style={styles.mediaPreviewViewOnce}
                onPress={() => sendPendingMedia(true)}
                disabled={sending}
              >
                <Text style={styles.mediaPreviewViewOnceText}>🔥</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.mediaPreviewSend} onPress={() => sendPendingMedia(false)} disabled={sending}>
              {sending ? (
                mediaUploadProgress != null && mediaUploadProgress > 0 ? (
                  <Text style={styles.mediaPreviewSendText}>{Math.round(mediaUploadProgress * 100)}%</Text>
                ) : (
                  <ActivityIndicator color="#fff" />
                )
              ) : (
                <Text style={styles.mediaPreviewSendText}>Yuborish</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    <ImageGalleryViewer
      visible={!!galleryMessageId}
      messages={galleryImages}
      initialMessageId={galleryMessageId ?? ""}
      conversationKey={conversationKey ?? ""}
      onClose={() => setGalleryMessageId(null)}
    />
    <Modal visible={gifPickerVisible} animationType="slide" onRequestClose={() => setGifPickerVisible(false)}>
      <View style={styles.container}>
        <View style={styles.searchHeader}>
          <TouchableOpacity onPress={() => setGifPickerVisible(false)}>
            <Text style={styles.searchClose}>Yopish</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: "600", color: colors.text }}>GIF tanlang</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: colors.background, borderRadius: 10, marginHorizontal: 12, marginVertical: 8, paddingHorizontal: 12, height: 40, gap: 8 }}>
          <Text style={{ fontSize: 14 }}>🔍</Text>
          <TextInput
            style={{ flex: 1, fontSize: 15, color: colors.text, height: "100%", padding: 0 }}
            placeholder="GIF qidirish..."
            placeholderTextColor={colors.textSecondary}
            value={gifSearch}
            onChangeText={onSearchGif}
            returnKeyType="search"
          />
          {gifSearch.length > 0 && (
            <TouchableOpacity onPress={() => onSearchGif("")} hitSlop={8}>
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {gifLoading ? (
          <View style={styles.centerContent}><ActivityIndicator color={colors.primary} /></View>
        ) : (
          <FlatList
            data={gifResults}
            numColumns={2}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 4 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.gifItem}
                onPress={() => onSendGif(item)}
              >
                <Image source={{ uri: item.previewUrl }} style={styles.gifImage} resizeMode="cover" />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.centerContent}><Text style={{ color: colors.textSecondary }}>GIF topilmadi</Text></View>
            }
          />
        )}
      </View>
    </Modal>
    <Modal visible={showTranslateLangPicker} transparent animationType="fade" onRequestClose={() => setShowTranslateLangPicker(false)}>
      <Pressable style={styles.actionBackdrop} onPress={() => setShowTranslateLangPicker(false)}>
        <View style={styles.actionSheet}>
          <Text style={styles.translationLabel}>Tarjima tili</Text>
          <ScrollView style={{ maxHeight: 350 }}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[styles.actionButton, translateLang === lang.code && { backgroundColor: colors.primary + "22" }]}
                onPress={() => {
                  setTranslateLang(lang.code);
                  setShowTranslateLangPicker(false);
                  if (pendingTranslateMsg) {
                    onTranslateMessage(pendingTranslateMsg, lang.code);
                    setPendingTranslateMsg(null);
                  }
                }}
              >
                <Text style={styles.actionButtonText}>{lang.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 12, flexGrow: 1 },
  scrollToBottomButton: {
    position: "absolute",
    right: 12,
    bottom: 76,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  scrollToBottomIcon: { fontSize: 18, color: colors.primary, fontWeight: "700" },
  mentionButton: { bottom: 124 },
  scrollToBottomBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollToBottomBadgeText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  loadingMore: { marginVertical: 12 },
  bubbleRow: { flexDirection: "row", marginVertical: 4, alignItems: "center" },
  bubbleRowSelf: { justifyContent: "flex-end" },
  bubbleRowOther: { justifyContent: "flex-start" },
  systemMessageRow: { alignItems: "center", marginVertical: 6 },
  systemMessageText: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    textAlign: "center",
    overflow: "hidden",
  },
  dateSeparatorRow: { alignItems: "center", marginVertical: 10 },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: "hidden",
  },
  unreadSeparatorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    paddingHorizontal: 16,
  },
  unreadSeparatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.danger,
    opacity: 0.4,
  },
  unreadSeparatorText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.danger,
    marginHorizontal: 8,
  },
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
  senderTitle: { fontSize: 12, fontWeight: "400", color: colors.textSecondary },
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
  pinnedExpiry: { fontSize: 11, color: colors.textSecondary, marginTop: 1 },
  pinnedListIcon: { fontSize: 16, color: colors.textSecondary, paddingHorizontal: 4 },
  pinnedClose: { fontSize: 16, color: colors.textSecondary, paddingHorizontal: 4 },
  descriptionBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  descriptionBannerIcon: { fontSize: 14 },
  descriptionBannerText: { flex: 1, fontSize: 13, color: colors.textSecondary },
  keyChangeBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.danger,
    gap: 8,
  },
  keyChangeBannerIcon: { fontSize: 14 },
  keyChangeBannerText: { flex: 1, fontSize: 13, color: "#fff", fontWeight: "600" },
  keyChangeBannerClose: { fontSize: 14, color: "#fff", fontWeight: "700", padding: 4 },
  messageText: { fontSize: 16, color: colors.text },
  stickerText: { fontSize: 56, lineHeight: 64 },
  mentionText: { color: colors.primary, fontWeight: "600" },
  linkText: { color: colors.primary, textDecorationLine: "underline" },
  hashtagText: { color: colors.primary, fontWeight: "600" },
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
  messageInfoList: { marginBottom: 8 },
  messageInfoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  messageInfoLabel: { fontSize: 14, color: colors.textSecondary },
  messageInfoValue: { fontSize: 14, color: colors.text, fontWeight: "600" },
  editHistoryLoader: { marginVertical: 24 },
  editHistoryRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  editHistoryTime: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
  editHistoryText: { fontSize: 15, color: colors.text, lineHeight: 20 },
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
  quickReactionBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  quickReactionHint: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: 8,
  },
  moreReactionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingBottom: 16,
  },
  stickerPackTabs: { marginBottom: 12 },
  stickerPackTab: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  stickerPackTabActive: { backgroundColor: colors.primary },
  stickerPackTabIcon: { fontSize: 22 },
  stickerPackTabText: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  stickerPackTabTextActive: { color: "#fff" },
  stickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    paddingBottom: 16,
  },
  stickerOption: {
    width: "25%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stickerEmoji: { fontSize: 40 },
  customReactionRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 8 },
  customReactionInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    color: colors.text,
  },
  customReactionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  customReactionButtonDisabled: { opacity: 0.4 },
  customReactionButtonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
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
  headerTitleContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitleTextContainer: { alignItems: "flex-start" },
  headerTitleText: { fontSize: 17, fontWeight: "600", color: colors.text },
  headerSubtitle: { fontSize: 12, color: colors.textSecondary },
  typingRow: { flexDirection: "row" as const, alignItems: "center" as const, paddingHorizontal: 16, paddingBottom: 4 },
  typing: { color: colors.textSecondary, fontSize: 12 },
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
  formatToolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  formatButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  formatButtonText: { fontSize: 16, color: colors.text },
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
  locationBubble: { width: 200, borderRadius: 8, overflow: "hidden" },
  locationMap: { width: 200, height: 120, backgroundColor: colors.border },
  locationPin: { position: "absolute", top: 40, left: 85, width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  locationInfo: { padding: 8 },
  locationLabel: { fontSize: 13, fontWeight: "600", color: colors.text },
  locationCoords: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  slowModeBar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  slowModeText: { fontSize: 12, color: colors.textSecondary, textAlign: "center" },
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
  formatHelpIcon: { fontSize: 14, fontWeight: "700", color: colors.primary },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    color: colors.text,
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
  searchDateIcon: { fontSize: 20 },
  searchResult: { paddingHorizontal: 16, paddingVertical: 12 },
  searchResultAuthor: { fontSize: 12, color: colors.primary, fontWeight: "600", marginBottom: 2 },
  searchResultText: { fontSize: 15, color: colors.text },
  searchResultTime: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  searchHighlight: { backgroundColor: colors.primary, color: "#fff", fontWeight: "700" },
  searchSeparator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  searchLoadMore: { padding: 16, alignItems: "center" },
  searchLoadMoreText: { color: colors.primary, fontWeight: "600" },
  searchEmpty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  searchSenderFilterBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  dateJumpSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  dateJumpHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dateJumpNav: { fontSize: 22, color: colors.primary, fontWeight: "700", paddingHorizontal: 12 },
  dateJumpNavDisabled: { color: colors.border },
  dateJumpTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  dateJumpWeekdays: { flexDirection: "row", marginBottom: 4 },
  dateJumpWeekday: {
    flexBasis: "14.2857%",
    textAlign: "center",
    fontSize: 12,
    color: colors.textSecondary,
    paddingVertical: 6,
  },
  dateJumpGrid: { flexDirection: "row", flexWrap: "wrap" },
  dateJumpCell: {
    flexBasis: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dateJumpCellText: { fontSize: 15, color: colors.text },
  dateJumpCellTextDisabled: { color: colors.border },
  dateJumpLoading: { marginTop: 12 },
  senderChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    maxWidth: 140,
  },
  senderChipActive: { backgroundColor: colors.primary },
  senderChipText: { fontSize: 13, color: colors.text },
  senderChipTextActive: { color: "#fff", fontWeight: "600" },
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
  pollDeadlineValue: { fontSize: 15, color: colors.textSecondary },
  pollHint: { fontSize: 12, color: colors.textSecondary, marginTop: -2, marginBottom: 4 },
  pollCorrectRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.textSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  pollCorrectRadioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  pollCorrectCheck: { color: "#fff", fontSize: 12, fontWeight: "700" },
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
  mediaPreviewCounter: {
    alignSelf: "center",
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  mediaPreviewFileBadge: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
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
  mediaPreviewSpoiler: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  mediaPreviewSpoilerActive: {
    backgroundColor: colors.primary,
  },
  mediaPreviewSpoilerText: { fontSize: 20 },
  mediaPreviewSend: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  mediaPreviewSendText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  centerContent: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, padding: 48 },
  gifItem: {
    flex: 1,
    margin: 2,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.border,
  },
  gifImage: {
    width: "100%",
    aspectRatio: 1,
  },
  translationBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: 4,
  },
  translationLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  translationText: { fontSize: 14, color: colors.text, flex: 1 },
  translationDismiss: { fontSize: 12, color: colors.textSecondary, paddingHorizontal: 4 },
});
