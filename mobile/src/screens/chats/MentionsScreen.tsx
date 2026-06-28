import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore, decryptReplyPreview } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { Conversation, Message } from "../../types";
import { getConversationDisplay, formatTime } from "../../utils/conversation";
import { getPreviewLabel } from "../../utils/messagePreview";
import { chatsApi } from "../../api/chats";

type Props = NativeStackScreenProps<RootStackParamList, "Mentions">;

export function MentionsScreen({ navigation }: Props) {
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const contactAliases = useChatStore((s) => s.contactAliases);
  const getConversationKey = useChatStore((s) => s.getConversationKey);
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await chatsApi.listMentions();
    setMessages(data);
  }, []);

  const loadAll = useCallback(() => {
    setError(false);
    return Promise.all([load(), loadConversations()])
      .catch(() => setError(true));
  }, [load, loadConversations]);

  useFocusEffect(
    useCallback(() => {
      loadAll().finally(() => setLoading(false));
    }, [loadAll])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  };

  const getPreview = (item: Message, conversation: Conversation): string => {
    try {
      const key = getConversationKey(conversation);
      return getPreviewLabel(decryptReplyPreview(key, item));
    } catch {
      return "🔒 Xabarni ochib bo'lmadi";
    }
  };

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
        onPress={() =>
          navigation.navigate("ChatRoom", { conversationId: conversation.id, title: display.title, highlightMessageId: item.id })
        }
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
    return <ErrorView message="Eslatmalarni yuklab bo'lmadi" onRetry={() => { setLoading(true); loadAll().finally(() => setLoading(false)); }} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>@ Sizni eslatib o'tgan xabarlar yo'q</Text>
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
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
});
