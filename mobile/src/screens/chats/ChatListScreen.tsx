import { useCallback, useEffect } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useState } from "react";
import { MainTabScreenProps } from "../../navigation/types";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { Conversation } from "../../types";
import { getConversationDisplay, formatTime } from "../../utils/conversation";
import { decryptMessage } from "../../crypto/e2ee";

type Props = MainTabScreenProps<"Chats">;

const MEDIA_LABELS: Record<string, string> = {
  IMAGE: "🖼 Rasm",
  VIDEO: "🎬 Video",
  AUDIO: "🎵 Ovozli xabar",
  FILE: "📄 Fayl",
};

export function ChatListScreen({ navigation }: Props) {
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const getConversationKey = useChatStore((s) => s.getConversationKey);
  const setupSocketListeners = useChatStore((s) => s.setupSocketListeners);
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setupSocketListeners();
  }, [setupSocketListeners]);

  useFocusEffect(
    useCallback(() => {
      loadConversations().catch(() => {});
    }, [loadConversations])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations().catch(() => {});
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

  const renderItem = ({ item }: { item: Conversation }) => {
    const display = getConversationDisplay(item, user!.id);
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate("ChatRoom", { conversationId: item.id, title: display.title })}
      >
        <Avatar uri={display.avatarUrl} name={display.title} />
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.title} numberOfLines={1}>
              {display.title}
            </Text>
            {item.lastMessage && <Text style={styles.time}>{formatTime(item.lastMessage.createdAt)}</Text>}
          </View>
          <Text style={styles.preview} numberOfLines={1}>
            {renderPreview(item)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Hali suhbatlar yo'q</Text>
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
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  content: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 16, fontWeight: "600", color: colors.text, flex: 1 },
  time: { fontSize: 12, color: colors.textSecondary, marginLeft: 8 },
  preview: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
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
