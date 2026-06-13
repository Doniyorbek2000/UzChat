import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore, decryptReplyPreview } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme/colors";
import { PinnedMessageInfo } from "../../types";
import { formatTime } from "../../utils/conversation";
import { getPreviewLabel } from "../../utils/messagePreview";

type Props = NativeStackScreenProps<RootStackParamList, "PinnedMessages">;

export function PinnedMessagesScreen({ route, navigation }: Props) {
  const { conversationId, title } = route.params;
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === conversationId));
  const contactAliases = useChatStore((s) => s.contactAliases);
  const getConversationKey = useChatStore((s) => s.getConversationKey);
  const unpinMessage = useChatStore((s) => s.unpinMessage);
  const unpinAllMessages = useChatStore((s) => s.unpinAllMessages);
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState("");

  const pinnedMessages = conversation?.pinnedMessages ?? [];
  const conversationKey = conversation ? getConversationKey(conversation) : null;
  const myRole = conversation?.participants.find((p) => p.userId === user?.id)?.role;
  const canManagePins = conversation?.type !== "GROUP" || myRole === "OWNER" || myRole === "ADMIN";

  const onUnpinAll = () => {
    Alert.alert("Hammasini yechish", "Barcha qadalgan xabarlar olib tashlansinmi?", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "Olib tashlash", style: "destructive", onPress: () => unpinAllMessages(conversationId).catch(() => {}) },
    ]);
  };

  useEffect(() => {
    navigation.setOptions({
      headerRight:
        pinnedMessages.length > 0 && canManagePins
          ? () => (
              <TouchableOpacity onPress={onUnpinAll} hitSlop={8}>
                <Text style={styles.unpinAllButton}>Hammasini yechish</Text>
              </TouchableOpacity>
            )
          : undefined,
    });
  }, [navigation, pinnedMessages.length, canManagePins]);

  const getAuthorName = (senderId: string) => {
    if (senderId === user?.id) return "Siz";
    return contactAliases[senderId] ?? conversation?.participants.find((p) => p.userId === senderId)?.user.displayName ?? "";
  };

  const filteredPinnedMessages = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return pinnedMessages;
    return pinnedMessages.filter((item) => {
      const preview = conversationKey ? decryptReplyPreview(conversationKey, item) : null;
      const label = preview ? getPreviewLabel(preview) : "";
      const author = getAuthorName(item.senderId);
      return label.toLowerCase().includes(query) || author.toLowerCase().includes(query);
    });
  }, [pinnedMessages, search, conversationKey]);

  const onUnpin = (item: PinnedMessageInfo) => {
    Alert.alert("Qadalgan xabar", "Xabarni qadashdan olib tashlansinmi?", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "Olib tashlash", style: "destructive", onPress: () => unpinMessage(conversationId, item.id).catch(() => {}) },
    ]);
  };

  const onSelect = (item: PinnedMessageInfo) => {
    navigation.navigate("ChatRoom", { conversationId, title, highlightMessageId: item.id });
  };

  return (
    <View style={styles.container}>
      {pinnedMessages.length > 0 && (
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
        data={filteredPinnedMessages}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const preview = conversationKey ? decryptReplyPreview(conversationKey, item) : null;
          return (
            <TouchableOpacity style={styles.row} onPress={() => onSelect(item)}>
              <View style={styles.content}>
                <View style={styles.topRow}>
                  <Text style={styles.author} numberOfLines={1}>
                    {getAuthorName(item.senderId)}
                  </Text>
                  <Text style={styles.time}>{formatTime(item.pinnedAt)}</Text>
                </View>
                <Text style={styles.preview} numberOfLines={2}>
                  {preview ? getPreviewLabel(preview) : "🔒 Xabarni ochib bo'lmadi"}
                </Text>
              </View>
              {canManagePins && (
                <TouchableOpacity onPress={() => onUnpin(item)} hitSlop={8}>
                  <Text style={styles.unpinIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{search ? "Hech narsa topilmadi" : "📌 Qadalgan xabarlar yo'q"}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "flex-start", padding: 12, gap: 12 },
  content: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  author: { fontSize: 14, fontWeight: "600", color: colors.primary, flex: 1 },
  time: { fontSize: 12, color: colors.textSecondary, marginLeft: 8 },
  preview: { fontSize: 14, color: colors.text, marginTop: 2 },
  unpinIcon: { fontSize: 16, color: colors.textSecondary, paddingHorizontal: 4 },
  unpinAllButton: { fontSize: 14, color: colors.danger, fontWeight: "600" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 12 },
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
