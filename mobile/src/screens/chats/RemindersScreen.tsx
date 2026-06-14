import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore, decryptReplyPreview } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { MessageReminderInfo } from "../../types";
import { getConversationDisplay, formatTime } from "../../utils/conversation";
import { getPreviewLabel } from "../../utils/messagePreview";
import { formatReminderTimeRemaining } from "../../utils/messageReminders";

type Props = NativeStackScreenProps<RootStackParamList, "Reminders">;

export function RemindersScreen({ navigation }: Props) {
  const reminders = useChatStore((s) => s.reminders);
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const fetchReminders = useChatStore((s) => s.fetchReminders);
  const cancelReminder = useChatStore((s) => s.cancelReminder);
  const contactAliases = useChatStore((s) => s.contactAliases);
  const getConversationKey = useChatStore((s) => s.getConversationKey);
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  useFocusEffect(
    useCallback(() => {
      Promise.all([fetchReminders(), loadConversations()])
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [fetchReminders, loadConversations])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReminders().catch(() => {});
    setRefreshing(false);
  };

  const getPreview = (item: MessageReminderInfo, conversationKey: string | null): string => {
    if (!conversationKey) return "🔒 Xabarni ochib bo'lmadi";
    const preview = decryptReplyPreview(conversationKey, item.message);
    return getPreviewLabel(preview);
  };

  const onCancel = (item: MessageReminderInfo) => {
    Alert.alert("Eslatma", "Ushbu xabar uchun eslatma o'chirilsinmi?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: () => cancelReminder(item.conversationId, item.message.id).catch(() => {}),
      },
    ]);
  };

  const filteredReminders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return reminders;
    return reminders.filter((item) => {
      const conversation = conversations.find((c) => c.id === item.conversationId);
      if (!conversation) return false;
      const conversationKey = getConversationKey(conversation);
      const display = getConversationDisplay(conversation, user!.id, contactAliases);
      const preview = getPreview(item, conversationKey);
      return display.title.toLowerCase().includes(query) || preview.toLowerCase().includes(query);
    });
  }, [reminders, search, conversations, user, contactAliases]);

  const renderItem = ({ item }: { item: MessageReminderInfo }) => {
    const conversation = conversations.find((c) => c.id === item.conversationId);
    if (!conversation) return null;
    const conversationKey = getConversationKey(conversation);
    const display = getConversationDisplay(conversation, user!.id, contactAliases);
    const senderName =
      item.message.senderId === user?.id
        ? "Siz"
        : contactAliases[item.message.senderId] ??
          conversation.participants.find((p) => p.userId === item.message.senderId)?.user.displayName ??
          "";

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() =>
          navigation.navigate("ChatRoom", {
            conversationId: conversation.id,
            title: display.title,
            highlightMessageId: item.message.id,
          })
        }
        onLongPress={() => onCancel(item)}
      >
        <Avatar uri={display.avatarUrl} name={display.title} icon={conversation.isSelf ? "📝" : undefined} />
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.title} numberOfLines={1}>
              {display.title}
            </Text>
            <Text style={styles.time}>{formatTime(item.message.createdAt)}</Text>
          </View>
          {conversation.type === "GROUP" && senderName ? (
            <Text style={styles.sender} numberOfLines={1}>
              {senderName}
            </Text>
          ) : null}
          <Text style={styles.preview} numberOfLines={2}>
            {getPreview(item, conversationKey)}
          </Text>
          <Text style={styles.remindAt}>⏰ {formatReminderTimeRemaining(item.remindAt)}</Text>
        </View>
        <TouchableOpacity onPress={() => onCancel(item)} hitSlop={8}>
          <Text style={styles.cancelIcon}>✕</Text>
        </TouchableOpacity>
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

  return (
    <View style={styles.container}>
      {reminders.length > 0 && (
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Qidirish"
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
        data={filteredReminders}
        keyExtractor={(item) => item.message.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{search ? "Hech narsa topilmadi" : "⏰ Eslatmalar yo'q"}</Text>
          </View>
        }
      />
    </View>
  );
}

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
  remindAt: { fontSize: 11, color: colors.primary, marginTop: 2 },
  cancelIcon: { fontSize: 16, color: colors.textSecondary, paddingHorizontal: 4 },
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
