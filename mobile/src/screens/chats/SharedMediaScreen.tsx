import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore, decryptToMessage, DecryptedMessage } from "../../store/chatStore";
import { chatsApi } from "../../api/chats";
import { MediaImageBubble } from "../../components/MediaImageBubble";
import { MediaFileBubble } from "../../components/MediaFileBubble";
import { MediaAudioBubble } from "../../components/MediaAudioBubble";
import { colors } from "../../theme/colors";
import { formatTime } from "../../utils/conversation";

type Props = NativeStackScreenProps<RootStackParamList, "SharedMedia">;

const PAGE_SIZE = 30;

export function SharedMediaScreen({ route }: Props) {
  const { conversationId } = route.params;
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === conversationId));
  const getConversationKey = useChatStore((s) => s.getConversationKey);

  const [items, setItems] = useState<DecryptedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!conversation) return;
      const key = getConversationKey(conversation);
      setLoading(true);
      chatsApi
        .listMedia(conversationId)
        .then((messages) => {
          setItems(messages.map((m) => decryptToMessage(key, m)));
          setHasMore(messages.length === PAGE_SIZE);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [conversation, conversationId, getConversationKey])
  );

  const onEndReached = async () => {
    if (loadingMore || !hasMore || !conversation || items.length === 0) return;
    setLoadingMore(true);
    try {
      const key = getConversationKey(conversation);
      const oldest = items[items.length - 1];
      const more = await chatsApi.listMedia(conversationId, oldest.createdAt);
      setItems((prev) => [...prev, ...more.map((m) => decryptToMessage(key, m))]);
      setHasMore(more.length === PAGE_SIZE);
    } catch {
      // ignore, user can retry by scrolling again
    } finally {
      setLoadingMore(false);
    }
  };

  if (!conversation) return null;

  const conversationKey = getConversationKey(conversation);
  const isGroup = conversation.type === "GROUP";

  const renderItem = ({ item }: { item: DecryptedMessage }) => {
    const sender = conversation.participants.find((p) => p.userId === item.senderId)?.user;

    let content;
    if (item.type === "IMAGE") {
      content = <MediaImageBubble message={item} conversationKey={conversationKey} />;
    } else if (item.type === "AUDIO") {
      content = <MediaAudioBubble message={item} conversationKey={conversationKey} />;
    } else {
      content = <MediaFileBubble message={item} conversationKey={conversationKey} />;
    }

    return (
      <View style={styles.item}>
        <View style={styles.itemHeader}>
          {isGroup && sender && <Text style={styles.sender}>{sender.displayName}</Text>}
          <Text style={styles.date}>{formatTime(item.createdAt)}</Text>
        </View>
        {content}
      </View>
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
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Hali umumiy media yo'q</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  item: { padding: 12 },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sender: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  date: { fontSize: 12, color: colors.textSecondary, marginLeft: "auto" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  footer: { paddingVertical: 16 },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
});
