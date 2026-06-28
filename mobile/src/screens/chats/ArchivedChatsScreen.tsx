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
import { stripFormatting } from "../../utils/textFormat";

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
  const favoriteContactIds = useChatStore((s) => s.favoriteContactIds);
  const loadContactAliases = useChatStore((s) => s.loadContactAliases);
  const getConversationKey = useChatStore((s) => s.getConversationKey);
  const setupSocketListeners = useChatStore((s) => s.setupSocketListeners);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const togglePin = useChatStore((s) => s.togglePin);
  const muteConversation = useChatStore((s) => s.muteConversation);
  const toggleArchive = useChatStore((s) => s.toggleArchive);
  const toggleUnread = useChatStore((s) => s.toggleUnread);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const drafts = useChatStore((s) => s.drafts);
  const loadDrafts = useChatStore((s) => s.loadDrafts);
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    if (!selectionMode) {
      navigation.setOptions({ title: "Arxivlangan suhbatlar", headerLeft: undefined, headerRight: undefined });
      return;
    }
    navigation.setOptions({
      title: `${selectedIds.size} ta tanlandi`,
      headerLeft: () => (
        <TouchableOpacity onPress={exitSelectionMode} hitSlop={8}>
          <Text style={styles.headerActionIcon}>✕</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onToggleSelectAll} hitSlop={8}>
            <Text style={styles.headerActionIcon}>☑️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBulkPin} hitSlop={8}>
            <Text style={styles.headerActionIcon}>📌</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBulkMarkRead} hitSlop={8}>
            <Text style={styles.headerActionIcon}>✅</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBulkUnarchive} hitSlop={8}>
            <Text style={styles.headerActionIcon}>📤</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBulkDelete} hitSlop={8}>
            <Text style={styles.headerActionIcon}>🗑</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, selectionMode, selectedIds, conversations]);

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const enterSelectionMode = (conversationId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([conversationId]));
  };

  const toggleSelected = (conversationId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(conversationId)) next.delete(conversationId);
      else next.add(conversationId);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  };

  const onToggleSelectAll = () => {
    const ids = archivedConversations.map((c) => c.id);
    if (selectedIds.size >= ids.length) {
      exitSelectionMode();
    } else {
      setSelectedIds(new Set(ids));
    }
  };

  const onBulkPin = async () => {
    const items = conversations.filter((c) => selectedIds.has(c.id));
    if (items.length === 0) return;
    const allPinned = items.every((c) => c.isPinned);
    for (const item of items) {
      if (item.isPinned === allPinned) {
        await togglePin(item.id).catch(() => {});
      }
    }
    exitSelectionMode();
  };

  const onBulkMarkRead = async () => {
    const ids = [...selectedIds];
    await Promise.all(
      ids.map((id) => {
        const c = conversations.find((conv) => conv.id === id);
        return c && isConversationUnread(c, user!.id) ? toggleUnread(id).catch(() => {}) : Promise.resolve();
      })
    );
    exitSelectionMode();
  };

  const onBulkUnarchive = async () => {
    const ids = [...selectedIds];
    await Promise.all(ids.map((id) => toggleArchive(id).catch(() => {})));
    exitSelectionMode();
  };

  const onBulkDelete = () => {
    const ids = [...selectedIds];
    Alert.alert("Suhbatlarni o'chirish", `${ids.length} ta suhbat ro'yxatdan o'chiriladi`, [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          await Promise.all(ids.map((id) => deleteConversation(id).catch(() => {})));
          exitSelectionMode();
        },
      },
    ]);
  };

  const renderPreview = (conversation: Conversation): string => {
    const lastMessage = conversation.lastMessage;
    if (!lastMessage) return "Xabarlar yo'q";
    if (lastMessage.type === "SYSTEM") return lastMessage.ciphertext;
    if (lastMessage.deletedAt) return "Xabar o'chirildi";
    if (lastMessage.type in MEDIA_LABELS) return MEDIA_LABELS[lastMessage.type];
    try {
      const key = getConversationKey(conversation);
      return stripFormatting(decryptMessage(lastMessage.ciphertext, lastMessage.nonce, key));
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
      { text: "2 soatga", onPress: () => muteConversation(item.id, "2h").catch(() => {}) },
      { text: "8 soatga", onPress: () => muteConversation(item.id, "8h").catch(() => {}) },
      { text: "1 kunga", onPress: () => muteConversation(item.id, "1d").catch(() => {}) },
      { text: "2 kunga", onPress: () => muteConversation(item.id, "2d").catch(() => {}) },
      { text: "1 haftaga", onPress: () => muteConversation(item.id, "1w").catch(() => {}) },
      { text: "Doimiy", onPress: () => muteConversation(item.id, "forever").catch(() => {}) },
      { text: "Bekor qilish", style: "cancel" },
    ]);
  };

  const onLongPressConversation = (item: Conversation) => {
    Alert.alert(item.title ?? "Suhbat", undefined, [
      {
        text: "☑️ Tanlash",
        onPress: () => enterSelectionMode(item.id),
      },
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
    const otherParticipant =
      item.type === "DIRECT" ? item.participants.find((p) => p.userId !== user!.id) : undefined;
    const isFavorite = !!otherParticipant && favoriteContactIds.has(otherParticipant.userId);
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => {
          if (selectionMode) {
            toggleSelected(item.id);
            return;
          }
          navigation.navigate("ChatRoom", { conversationId: item.id, title: display.title });
        }}
        onLongPress={() => {
          if (selectionMode) return;
          onLongPressConversation(item);
        }}
      >
        {selectionMode && (
          <View style={[styles.selectCheckbox, selectedIds.has(item.id) && styles.selectCheckboxSelected]}>
            {selectedIds.has(item.id) && <Text style={styles.selectCheckmark}>✓</Text>}
          </View>
        )}
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
              {isFavorite && <Text style={styles.favoriteIcon}>⭐</Text>}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
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
  selectCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  selectCheckboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectCheckmark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  headerActionIcon: { fontSize: 20 },
  content: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: "600", color: colors.text, flex: 1 },
  titleUnread: { fontWeight: "700" },
  pinIcon: { fontSize: 12 },
  favoriteIcon: { fontSize: 12 },
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
