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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
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
import { useChatStore, DecryptedMessage } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { ConversationParticipant, MessageReaction, MessageType } from "../../types";
import { colors } from "../../theme/colors";
import { MediaImageBubble } from "../../components/MediaImageBubble";
import { MediaFileBubble } from "../../components/MediaFileBubble";
import { MediaAudioBubble } from "../../components/MediaAudioBubble";
import { formatDuration } from "../../utils/mediaFile";
import { formatTime } from "../../utils/conversation";
import { setActiveConversationId } from "../../utils/pushNotifications";

type Props = NativeStackScreenProps<RootStackParamList, "ChatRoom">;

const RECALL_WINDOW_MS = 2 * 60 * 1000;

const REPLY_TYPE_LABELS: Partial<Record<MessageType, string>> = {
  IMAGE: "🖼 Rasm",
  VIDEO: "🎬 Video",
  AUDIO: "🎵 Ovozli xabar",
  FILE: "📄 Fayl",
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

export function ChatRoomScreen({ route, navigation }: Props) {
  const { conversationId, title } = route.params;
  const user = useAuthStore((s) => s.user);
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === conversationId));
  const messages = useChatStore((s) => s.messagesByConversation[conversationId] ?? []);
  const hasMore = useChatStore((s) => s.hasMoreByConversation[conversationId] ?? false);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const loadOlderMessages = useChatStore((s) => s.loadOlderMessages);
  const sendTextMessage = useChatStore((s) => s.sendTextMessage);
  const sendMediaMessage = useChatStore((s) => s.sendMediaMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const toggleReaction = useChatStore((s) => s.toggleReaction);
  const markRead = useChatStore((s) => s.markRead);
  const setTyping = useChatStore((s) => s.setTyping);
  const typingUsers = useChatStore((s) => s.typingUsers[conversationId]);
  const getConversationKey = useChatStore((s) => s.getConversationKey);
  const onlineUsers = useChatStore((s) => s.onlineUsers);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recording, setRecording] = useState(false);
  const [replyingTo, setReplyingTo] = useState<DecryptedMessage | null>(null);
  const [actionMessage, setActionMessage] = useState<DecryptedMessage | null>(null);
  const listRef = useRef<FlatList<DecryptedMessage>>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const otherParticipant =
    conversation?.type === "DIRECT" ? conversation.participants.find((p) => p.userId !== user?.id) : null;
  const otherUser = otherParticipant?.user ?? null;
  const isOtherOnline = otherUser ? onlineUsers.has(otherUser.id) : false;
  const presenceLabel = otherUser
    ? isOtherOnline
      ? "Onlayn"
      : otherUser.lastSeenAt
        ? `Oxirgi marta: ${formatTime(otherUser.lastSeenAt)}`
        : ""
    : "";

  useEffect(() => {
    navigation.setOptions({
      title,
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
      headerRight:
        conversation?.type === "GROUP"
          ? () => (
              <TouchableOpacity onPress={() => navigation.navigate("GroupInfo", { conversationId })} hitSlop={8}>
                <Text style={styles.headerInfoIcon}>ℹ️</Text>
              </TouchableOpacity>
            )
          : undefined,
    });
  }, [navigation, title, conversationId, conversation?.type, presenceLabel]);

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
    markRead(conversationId).catch(() => {});
  }, [conversationId, markRead, messages.length]);

  const conversationKey = conversation ? getConversationKey(conversation) : null;

  const scrollToLatest = () => listRef.current?.scrollToOffset({ offset: 0, animated: true });

  const getAuthorName = (senderId: string) => {
    if (senderId === user?.id) return "Siz";
    return conversation?.participants.find((p) => p.userId === senderId)?.user.displayName ?? "";
  };

  const onSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const replyToId = replyingTo?.id;
    setText("");
    setReplyingTo(null);
    setTyping(conversationId, false);
    try {
      await sendTextMessage(conversationId, trimmed, replyToId);
      scrollToLatest();
    } catch {
      setText(trimmed);
    }
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
    } catch {
      Alert.alert("Xatolik", "Rasmni yuborib bo'lmadi");
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
    } catch {
      Alert.alert("Xatolik", "Faylni yuborib bo'lmadi");
    } finally {
      setSending(false);
    }
  };

  const onAttach = () => {
    Alert.alert("Yuborish", "Nimani yubormoqchisiz?", [
      { text: "🖼 Rasm", onPress: pickImage },
      { text: "📄 Fayl", onPress: pickFile },
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
    } catch {
      Alert.alert("Xatolik", "Ovozli xabarni yuborib bo'lmadi");
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
    setActionMessage(item);
  };

  const onEndReached = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadOlderMessages(conversationId).catch(() => {});
    setLoadingMore(false);
  };

  const isGroup = conversation?.type === "GROUP";

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
    } else {
      content = <Text style={styles.messageText}>{item.text}</Text>;
    }

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => onLongPress(item)}
        style={[styles.bubbleRow, isOwn ? styles.bubbleRowSelf : styles.bubbleRowOther]}
      >
        <View style={[styles.bubble, isOwn ? styles.bubbleSelf : styles.bubbleOther, item.deletedAt && styles.bubbleDeleted]}>
          {isGroup && !isOwn && sender && <Text style={styles.senderName}>{sender.displayName}</Text>}
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
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={invertedData}
        inverted
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onEndReachedThreshold={0.3}
        onEndReached={onEndReached}
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
      {recording ? (
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
          <TouchableOpacity style={styles.attachButton} onPress={onAttach} disabled={sending}>
            {sending ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.attachIcon}>+</Text>}
          </TouchableOpacity>
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
            <TouchableOpacity style={styles.attachButton} onPress={startRecording} disabled={sending}>
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
              if (actionMessage) setReplyingTo(actionMessage);
              setActionMessage(null);
            }}
          >
            <Text style={styles.actionButtonText}>↩️ Javob berish</Text>
          </TouchableOpacity>
          {actionMessage && !actionMessage.decryptFailed && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                navigation.navigate("ForwardMessage", { conversationId, messageId: actionMessage.id });
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
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 12, flexGrow: 1 },
  loadingMore: { marginVertical: 12 },
  bubbleRow: { flexDirection: "row", marginVertical: 4 },
  bubbleRowSelf: { justifyContent: "flex-end" },
  bubbleRowOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleSelf: { backgroundColor: colors.bubbleSelf, borderTopRightRadius: 2 },
  bubbleOther: { backgroundColor: colors.bubbleOther, borderTopLeftRadius: 2 },
  bubbleDeleted: { opacity: 0.6 },
  senderName: { fontSize: 12, fontWeight: "600", color: colors.primaryDark, marginBottom: 2 },
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
  messageText: { fontSize: 16, color: colors.text },
  deletedText: { fontSize: 14, color: colors.textSecondary, fontStyle: "italic" },
  messageFooter: { flexDirection: "row", alignSelf: "flex-end", alignItems: "center", marginTop: 4, gap: 4 },
  messageTime: { fontSize: 10, color: colors.textSecondary },
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
});
