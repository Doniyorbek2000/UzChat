import { useCallback, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useState } from "react";
import { MainTabScreenProps } from "../../navigation/types";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { Conversation } from "../../types";
import { getConversationDisplay, formatTime, isConversationUnread } from "../../utils/conversation";
import { decryptMessage } from "../../crypto/e2ee";

type Props = MainTabScreenProps<"Chats">;

const MEDIA_LABELS: Record<string, string> = {
  IMAGE: "🖼 Rasm",
  VIDEO: "🎬 Video",
  AUDIO: "🎵 Ovozli xabar",
  FILE: "📄 Fayl",
  CONTACT: "👤 Kontakt",
};

export function ChatListScreen({ navigation }: Props) {
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
  const [searchQuery, setSearchQuery] = useState("");

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
      {
        text: item.isArchived ? "📤 Arxivdan chiqarish" : "🗄 Arxivlash",
        onPress: () => toggleArchive(item.id).catch(() => {}),
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
          icon={item.isSelf ? "🔖" : undefined}
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

  const visibleConversations = conversations.filter((c) => !c.isArchived);
  const archivedCount = conversations.length - visibleConversations.length;

  const query = searchQuery.trim().toLowerCase();
  const filteredConversations = query
    ? visibleConversations.filter((c) => {
        const display = getConversationDisplay(c, user!.id, contactAliases);
        if (display.title.toLowerCase().includes(query)) return true;
        return c.participants.some(
          (p) =>
            p.user.displayName.toLowerCase().includes(query) || p.user.username.toLowerCase().includes(query)
        );
      })
    : visibleConversations;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Qidirish"
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          !query && archivedCount > 0 ? (
            <TouchableOpacity style={styles.archiveRow} onPress={() => navigation.navigate("ArchivedChats")}>
              <Text style={styles.archiveIcon}>🗄</Text>
              <Text style={styles.archiveText}>Arxivlangan suhbatlar</Text>
              <Text style={styles.archiveCount}>{archivedCount}</Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{query ? "Hech narsa topilmadi" : "Hali suhbatlar yo'q"}</Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("NewChat")}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 10,
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, height: "100%", padding: 0 },
  searchClear: { fontSize: 14, color: colors.textSecondary, paddingHorizontal: 4 },
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
  archiveRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  archiveIcon: { fontSize: 20, width: 36, textAlign: "center" },
  archiveText: { flex: 1, fontSize: 15, color: colors.text },
  archiveCount: { fontSize: 13, color: colors.textSecondary },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabIcon: { color: "#fff", fontSize: 28, lineHeight: 30 },
});
