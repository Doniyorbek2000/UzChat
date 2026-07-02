import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { Conversation, Message, MessageType } from "../../types";
import { chatsApi } from "../../api/chats";
import { getConversationDisplay, formatTime } from "../../utils/conversation";
import { decryptMessage } from "../../crypto/e2ee";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "StarredMessages">;

const MEDIA_LABELS: Partial<Record<MessageType, string>> = {
  IMAGE: "🖼 Rasm",
  VIDEO: "🎬 Video",
  AUDIO: "🎵 Ovozli xabar",
  FILE: "📄 Fayl",
  CONTACT: "👤 Kontakt",
};

export function StarredMessagesScreen({ navigation }: Props) {
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const contactAliases = useChatStore((s) => s.contactAliases);
  const getConversationKey = useChatStore((s) => s.getConversationKey);
  const toggleStar = useChatStore((s) => s.toggleStar);
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const data = await chatsApi.listStarred();
    setMessages(data);
  }, []);

  const loadAll = useCallback(() => {
    setError(false);
    Promise.all([load(), loadConversations()])
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [load, loadConversations]);

  useFocusEffect(loadAll);

  const onRefresh = async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  };

  const onUnstar = (item: Message) => {
    setMessages((prev) => prev.filter((m) => m.id !== item.id));
    toggleStar(item.conversationId, item.id).catch(() => {});
  };

  const getPreview = (item: Message, conversation: Conversation): string => {
    if (item.deletedAt) return "🚫 Xabar o'chirildi";
    if (item.type !== "TEXT") return MEDIA_LABELS[item.type] ?? "Xabar";
    try {
      const key = getConversationKey(conversation);
      return decryptMessage(item.ciphertext, item.nonce, key);
    } catch {
      return "🔒 Xabarni ochib bo'lmadi";
    }
  };

  const filteredMessages = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return messages;
    return messages.filter((item) => {
      const conversation = conversations.find((c) => c.id === item.conversationId);
      if (!conversation) return false;
      const display = getConversationDisplay(conversation, user!.id, contactAliases);
      const senderName =
        item.senderId === user?.id
          ? "Siz"
          : contactAliases[item.senderId] ??
            conversation.participants.find((p) => p.userId === item.senderId)?.user.displayName ??
            "";
      const preview = getPreview(item, conversation);
      return (
        display.title.toLowerCase().includes(query) ||
        senderName.toLowerCase().includes(query) ||
        preview.toLowerCase().includes(query)
      );
    });
  }, [messages, search, conversations, user, contactAliases]);

  const renderItem = ({ item }: { item: Message }) => {
    const conversation = conversations.find((c) => c.id === item.conversationId);
    if (!conversation) return null;
    const display = getConversationDisplay(conversation, user!.id, contactAliases);
    const senderName =
      item.senderId === user?.id
        ? "Siz"
        : contactAliases[item.senderId] ??
          conversation.participants.find((p) => p.userId === item.senderId)?.user.displayName ??
          "";

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => navigation.navigate("ChatRoom", { conversationId: conversation.id, title: display.title })}
        onLongPress={() => onUnstar(item)}
      >
        <Avatar uri={display.avatarUrl} name={display.title} icon={conversation.isSelf ? "📝" : undefined} />
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.title} numberOfLines={1}>
              {display.title}
            </Text>
            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          </View>
          {(conversation.type === "GROUP" || conversation.type === "CHANNEL") && senderName ? (
            <Text style={styles.sender} numberOfLines={1}>
              {senderName}
            </Text>
          ) : null}
          <Text style={styles.preview} numberOfLines={2}>
            {getPreview(item, conversation)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message={tr("Yulduzli xabarlarni yuklab bo'lmadi")} onRetry={loadAll} />;
  }

  return (
    <View style={styles.container}>
      {messages.length > 0 && (
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={tr("Qidirish")}
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <FlatList
        keyboardShouldPersistTaps="handled"
        data={filteredMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={Separator}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{search ? "Hech narsa topilmadi" : "⭐ Saqlangan xabarlar yo'q"}</Text>
          </View>
        }
      />
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "flex-start", padding: 12, gap: 12 },
  content: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 16, fontWeight: "600", color: colors.text, flex: 1 },
  time: { fontSize: 12, color: colors.textSecondary, marginLeft: 8 },
  sender: { fontSize: 12, color: colors.primary, marginTop: 2 },
  preview: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
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
});
