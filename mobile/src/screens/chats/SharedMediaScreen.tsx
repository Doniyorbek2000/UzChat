import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
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

type MediaTab = "all" | "media" | "audio" | "files";

const TABS: { key: MediaTab; label: string }[] = [
  { key: "all", label: "Hammasi" },
  { key: "media", label: "Media" },
  { key: "audio", label: "Audio" },
  { key: "files", label: "Fayllar" },
];

function matchesTab(tab: MediaTab, type: DecryptedMessage["type"]) {
  switch (tab) {
    case "media":
      return type === "IMAGE" || type === "VIDEO";
    case "audio":
      return type === "AUDIO";
    case "files":
      return type === "FILE";
    default:
      return true;
  }
}

export function SharedMediaScreen({ route }: Props) {
  const { conversationId } = route.params;
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === conversationId));
  const getConversationKey = useChatStore((s) => s.getConversationKey);

  const [items, setItems] = useState<DecryptedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<MediaTab>("all");

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

  const filteredItems = useMemo(() => items.filter((item) => matchesTab(activeTab, item.type)), [items, activeTab]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {activeTab === "all" ? "Hali umumiy media yo'q" : "Bu turdagi fayllar topilmadi"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
  tabTextActive: { color: colors.primary, fontWeight: "700" },
  item: { padding: 12 },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sender: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  date: { fontSize: 12, color: colors.textSecondary, marginLeft: "auto" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  footer: { paddingVertical: 16 },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
});
