import { useCallback, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { Conversation } from "../../types";
import { getConversationDisplay, formatTime, isConversationUnread } from "../../utils/conversation";
import { decryptMessage } from "../../crypto/e2ee";

type Props = NativeStackScreenProps<RootStackParamList, "ArchivedChats">;

const MEDIA_LABELS: Record<string, string> = {
  IMAGE: "🖼 Rasm",
  VIDEO: "🎬 Video",
  AUDIO: "🎵 Ovozli xabar",
  FILE: "📄 Fayl",
};

export function ArchivedChatsScreen({ navigation }: Props) {
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const contactAliases = useChatStore((s) => s.contactAliases);
  const loadContactAliases = useChatStore((s) => s.loadContactAliases);
  const getConversationKey = useChatStore((s) => s.getConversationKey);
  const setupSocketListeners = useChatStore((s) => s.setupSocketListeners);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const togglePin = useChatStore((s) => s.togglePin);
  const muteConversation = useChatStore((s) => s.muteConversation);
  const toggleArchive = useChatStore((s) => s.toggleArchive);
  const toggleUnread = useChatStore((s) => s.toggleUnread);
  const drafts = useChatStore((s) => s.drafts);
  const loadDrafts = useChatStore((s) => s.loadDrafts);
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setupSocketListeners();
    loadDrafts().catch(() => {});
  }, [setupSocketListeners, loadDrafts]);

  useFocusEffect(
    useCallback(() => {
      loadConversations().catch(() => {});
      loadContactAliases().catch(() => {});
    }, [loadConversations, loadContactAliases])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadConversations().catch(() => {}), loadContactAliases().catch(() => {})]);
    setRefreshing(false);
  };

  const archivedConversations = conversations.filter((c) => c.isArchived);

  const renderPreview = (conversation: Conversation): string => {
    const lastMessage = conversation.lastMessage;
    if (!lastMessage) return "Xabarlar yo'q";
    if (lastMessage.deletedAt) return "Xabar o'chirildi";
    if (lastMessage.type in MEDIA_LABELS) return MEDIA_LABELS[lastMessage.type];
    try {
      const key = getConversationKey(conversation);
      return decryptMessage(lastMessage.ciphertext, lastMessage.nonce, key);
    } catch {
      return "Xabarni ochib bo'lmadi";
    }
  };

  const onMutePress = (item: Conversation) => {
    if (item.isMuted) {
      muteConversation(item.id, "off").catch(() => {});
      return;
    }
    Alert.alert("Ovozsiz qilish muddati", undefined, [
      { text: "1 soatga", onPress: () => muteConversation(item.id, "1h").catch(() => {}) },
      { text: "8 soatga", onPress: () => muteConversation(item.id, "8h").catch(() => {}) },
      { text: "1 haftaga", onPress: () => muteConversation(item.id, "1w").catch(() => {}) },
      { text: "Doimiy", onPress: () => muteConversation(item.id, "forever").catch(() => {}) },
      { text: "Bekor qilish", style: "cancel" },
    ]);
  };

  const onLongPressConversation = (item: Conversation) => {
    Alert.alert(item.title ?? "Suhbat", undefined, [
      {
        text: "📤 Arxivdan chiqarish",
        onPress: () => toggleArchive(item.id).catch(() => {}),
      },
      {
        text: isConversationUnread(item, user!.id) ? "✅ O'qilgan deb belgilash" : "🔵 O'qilmagan deb belgilash",
        onPress: () => toggleUnread(item.id).catch(() => {}),
      },
      {
        text: item.isPinned ? "📌 Qadashni bekor qilish" : "📌 Qadab qo'yish",
        onPress: () => togglePin(item.id).catch(() => {}),
      },
      {
        text: item.isMuted ? "🔔 Ovozli qilish" : "🔕 Ovozsiz qilish",
        onPress: () => onMutePress(item),
      },
      { text: "Bekor qilish", style: "cancel" },
    ]);
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const display = getConversationDisplay(item, user!.id, contactAliases);
    const unread = isConversationUnread(item, user!.id);
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate("ChatRoom", { conversationId: item.id, title: display.title })}
        onLongPress={() => onLongPressConversation(item)}
      >
        <Avatar
          uri={display.avatarUrl}
          name={display.title}
          online={!!display.otherUser && onlineUsers.has(display.otherUser.id)}
        />
        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.titleRow}>
              {item.isPinned && <Text style={styles.pinIcon}>📌</Text>}
              <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>
                {display.title}
              </Text>
            </View>
            {item.lastMessage && <Text style={styles.time}>{formatTime(item.lastMessage.createdAt)}</Text>}
          </View>
          <View style={styles.bottomRow}>
            <Text style={styles.preview} numberOfLines={1}>
              {drafts[item.id] ? (
                <>
                  <Text style={styles.draftLabel}>Qoralama: </Text>
                  {drafts[item.id]}
                </>
              ) : (
                renderPreview(item)
              )}
            </Text>
            {item.isMuted && <Text style={styles.muteIcon}>🔕</Text>}
            {unread && <View style={styles.unreadDot} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={archivedConversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>🗄 Arxivlangan suhbatlar yo'q</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  content: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: "600", color: colors.text, flex: 1 },
  titleUnread: { fontWeight: "700" },
  pinIcon: { fontSize: 12 },
  time: { fontSize: 12, color: colors.textSecondary, marginLeft: 8 },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  preview: { fontSize: 14, color: colors.textSecondary, flex: 1 },
  draftLabel: { color: colors.danger },
  muteIcon: { fontSize: 12, marginLeft: 8, color: colors.textSecondary },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginLeft: 8 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
});
