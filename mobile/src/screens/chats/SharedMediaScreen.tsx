import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore, decryptToMessage, DecryptedMessage } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { chatsApi } from "../../api/chats";
import { Avatar } from "../../components/Avatar";
import { MediaImageBubble } from "../../components/MediaImageBubble";
import { ImageGalleryViewer } from "../../components/ImageGalleryViewer";
import { MediaFileBubble } from "../../components/MediaFileBubble";
import { MediaAudioBubble } from "../../components/MediaAudioBubble";
import { LinkPreviewCard } from "../../components/LinkPreviewCard";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { formatTime, getConversationDisplay } from "../../utils/conversation";
import { extractFirstUrl } from "../../utils/linkPreview";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "SharedMedia">;

const PAGE_SIZE = 30;

type MediaTab = "all" | "media" | "audio" | "files" | "links";

const TABS: { key: MediaTab; label: string }[] = [
  { key: "all", label: tr("Hammasi") },
  { key: "media", label: tr("Media") },
  { key: "audio", label: tr("Audio") },
  { key: "files", label: tr("Fayllar") },
  { key: "links", label: tr("Havolalar") },
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

export function SharedMediaScreen({ route, navigation }: Props) {
  const { conversationId } = route.params;
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === conversationId));
  const messages = useChatStore((s) => s.messagesByConversation[conversationId] ?? []);
  const getConversationKey = useChatStore((s) => s.getConversationKey);
  const contactAliases = useChatStore((s) => s.contactAliases);
  const currentUser = useAuthStore((s) => s.user);

  const [items, setItems] = useState<DecryptedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<MediaTab>("all");
  const [selectedSenderId, setSelectedSenderId] = useState<string | null>(null);
  const [galleryMessageId, setGalleryMessageId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!conversation) return;
      const key = getConversationKey(conversation);
      setLoading(true);
      setError(false);
      chatsApi
        .listMedia(conversationId)
        .then((messages) => {
          setItems(messages.map((m) => decryptToMessage(key, m)));
          setHasMore(messages.length === PAGE_SIZE);
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }, [conversation, conversationId, getConversationKey])
  );

  const onEndReached = async () => {
    if (activeTab === "links" || loadingMore || !hasMore || !conversation || items.length === 0) return;
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
  const isGroup = conversation.type === "GROUP" || conversation.type === "CHANNEL";

  const onJumpToMessage = (item: DecryptedMessage) => {
    const { title } = getConversationDisplay(conversation, currentUser?.id ?? "", contactAliases);
    navigation.navigate("ChatRoom", { conversationId, title, highlightMessageId: item.id });
  };

  const renderItem = ({ item }: { item: DecryptedMessage }) => {
    const sender = conversation.participants.find((p) => p.userId === item.senderId)?.user;

    let content;
    if (item.type === "IMAGE") {
      content = (
        <MediaImageBubble message={item} conversationKey={conversationKey} onOpenViewer={() => setGalleryMessageId(item.id)} />
      );
    } else if (item.type === "AUDIO") {
      content = <MediaAudioBubble message={item} conversationKey={conversationKey} />;
    } else {
      content = <MediaFileBubble message={item} conversationKey={conversationKey} />;
    }

    return (
      <View style={styles.item}>
        <View style={styles.itemHeader}>
          {isGroup && sender && <Text style={styles.sender}>{contactAliases[sender.id] ?? sender.displayName}</Text>}
          <Text style={styles.date}>{formatTime(item.createdAt)}</Text>
          <TouchableOpacity style={styles.jumpButton} onPress={() => onJumpToMessage(item)} hitSlop={8}>
            <Text style={styles.jumpButtonText}>↗️</Text>
          </TouchableOpacity>
        </View>
        {content}
      </View>
    );
  };

  const renderLinkItem = ({ item }: { item: DecryptedMessage }) => {
    const sender = conversation.participants.find((p) => p.userId === item.senderId)?.user;
    const url = extractFirstUrl(item.text ?? "") ?? "";

    return (
      <View style={styles.item}>
        <View style={styles.itemHeader}>
          {isGroup && sender && <Text style={styles.sender}>{contactAliases[sender.id] ?? sender.displayName}</Text>}
          <Text style={styles.date}>{formatTime(item.createdAt)}</Text>
          <TouchableOpacity style={styles.jumpButton} onPress={() => onJumpToMessage(item)} hitSlop={8}>
            <Text style={styles.jumpButtonText}>↗️</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.linkText} numberOfLines={3}>
          {item.text}
        </Text>
        <LinkPreviewCard url={url} />
      </View>
    );
  };

  const linkMessages = useMemo(
    () => messages.filter((m) => m.type === "TEXT" && !m.deletedAt && !m.decryptFailed && extractFirstUrl(m.text ?? "")),
    [messages]
  );

  const senders = useMemo(() => {
    const seen = new Map<string, { id: string; displayName: string; avatarUrl: string | null }>();
    for (const item of items) {
      if (seen.has(item.senderId)) continue;
      const user = conversation.participants.find((p) => p.userId === item.senderId)?.user;
      if (user) seen.set(item.senderId, { id: user.id, displayName: contactAliases[user.id] ?? user.displayName, avatarUrl: user.avatarUrl });
    }
    return [...seen.values()];
  }, [items, conversation.participants, contactAliases]);

  const filteredItems = useMemo(
    () =>
      items.filter(
        (item) => matchesTab(activeTab, item.type) && (!selectedSenderId || item.senderId === selectedSenderId)
      ),
    [items, activeTab, selectedSenderId]
  );

  const galleryImages = useMemo(
    () => items.filter((item) => item.type === "IMAGE" && !item.viewOnce && !item.deletedAt && !item.decryptFailed),
    [items]
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message={tr("Mediafayllarni yuklab bo'lmadi")} onRetry={() => { setLoading(true); setError(false); if (conversation) { const key = getConversationKey(conversation); chatsApi.listMedia(conversationId).then((messages) => { setItems(messages.map((m) => decryptToMessage(key, m))); setHasMore(messages.length === PAGE_SIZE); }).catch(() => setError(true)).finally(() => setLoading(false)); } }} />;
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
      {activeTab !== "links" && isGroup && senders.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.senderFilterBar}>
          <TouchableOpacity
            style={[styles.senderChip, !selectedSenderId && styles.senderChipActive]}
            onPress={() => setSelectedSenderId(null)}
          >
            <Text style={[styles.senderChipText, !selectedSenderId && styles.senderChipTextActive]}>{tr("Hammasi")}</Text>
          </TouchableOpacity>
          {senders.map((sender) => (
            <TouchableOpacity
              key={sender.id}
              style={[styles.senderChip, selectedSenderId === sender.id && styles.senderChipActive]}
              onPress={() => setSelectedSenderId((prev) => (prev === sender.id ? null : sender.id))}
            >
              <Avatar uri={sender.avatarUrl} name={sender.displayName} size={20} />
              <Text style={[styles.senderChipText, selectedSenderId === sender.id && styles.senderChipTextActive]} numberOfLines={1}>
                {sender.displayName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
      <FlatList
        data={activeTab === "links" ? linkMessages : filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={activeTab === "links" ? renderLinkItem : renderItem}
        ItemSeparatorComponent={Separator}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore && activeTab !== "links" ? <ActivityIndicator style={styles.footer} color={colors.primary} /> : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {activeTab === "links"
                ? "Yuklangan xabarlar orasida havolalar topilmadi"
                : activeTab === "all"
                  ? "Hali umumiy media yo'q"
                  : "Bu turdagi fayllar topilmadi"}
            </Text>
          </View>
        }
      />
      <ImageGalleryViewer
        visible={!!galleryMessageId}
        messages={galleryImages}
        initialMessageId={galleryMessageId ?? ""}
        conversationKey={conversationKey}
        onClose={() => setGalleryMessageId(null)}
      />
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

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
  jumpButton: { marginLeft: 8, paddingHorizontal: 4 },
  jumpButtonText: { fontSize: 14 },
  linkText: { fontSize: 14, color: colors.text, marginBottom: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  footer: { paddingVertical: 16 },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
  senderFilterBar: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  senderChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
    maxWidth: 140,
  },
  senderChipActive: { backgroundColor: colors.primary },
  senderChipText: { fontSize: 13, color: colors.text },
  senderChipTextActive: { color: "#fff", fontWeight: "600" },
});
