import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { bookmarksApi, Bookmark } from "../../api/bookmarks";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";
import { tr } from "../../i18n";

const MESSAGE_TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  text: { icon: "💬", label: tr("Xabar") },
  image: { icon: "📷", label: tr("Rasm") },
  video: { icon: "🎬", label: tr("Video") },
  audio: { icon: "🎤", label: tr("Ovozli xabar") },
  voice: { icon: "🎤", label: tr("Ovozli xabar") },
  file: { icon: "📎", label: tr("Fayl") },
  document: { icon: "📄", label: tr("Hujjat") },
  location: { icon: "📍", label: tr("Joylashuv") },
  contact: { icon: "👤", label: tr("Kontakt") },
  sticker: { icon: "🎨", label: tr("Stiker") },
  gif: { icon: "🎞️", label: tr("GIF") },
  poll: { icon: "📊", label: tr("So'rovnoma") },
  reply: { icon: "↩️", label: tr("Javob") },
};

function getMessagePreview(msg: Bookmark["message"]): string {
  const typeInfo = MESSAGE_TYPE_LABELS[msg.type?.toLowerCase() ?? ""];
  if (typeInfo) return `${typeInfo.icon} ${typeInfo.label}`;
  return "🔒 Shifrlangan xabar";
}

type Props = NativeStackScreenProps<RootStackParamList, "Bookmarks">;

export function BookmarksScreen({ navigation }: Props) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    bookmarksApi.list().then(setBookmarks).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    bookmarksApi.list().then(setBookmarks).catch(() => {}).finally(() => setRefreshing(false));
  }, []);

  const handleRemove = (bookmark: Bookmark) => {
    Alert.alert(tr("O'chirish"), tr("Bu xatcho'pni o'chirmoqchimisiz?"), [
      { text: tr("Bekor qilish"), style: "cancel" },
      {
        text: tr("O'chirish"),
        style: "destructive",
        onPress: async () => {
          try {
            await bookmarksApi.remove(bookmark.id);
            setBookmarks((prev) => prev.filter((b) => b.id !== bookmark.id));
          } catch {
            Alert.alert(tr("Xatolik"), tr("Xatcho'pni o'chirib bo'lmadi"));
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message={tr("Xatcho'plarni yuklab bo'lmadi")} onRetry={loadData} />;
  }

  return (
    <View style={styles.container}>
      {bookmarks.length > 0 && (
        <Text style={styles.countText}>{bookmarks.length} ta xatcho'p</Text>
      )}
      <FlatList
        data={bookmarks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("ChatRoom", {
              conversationId: item.message.conversationId,
              title: item.message.conversation?.title ?? "",
              highlightMessageId: item.messageId,
            })}
            onLongPress={() => handleRemove(item)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.senderRow}>
                <View style={styles.senderAvatar}>
                  <Text style={styles.senderAvatarText}>{item.message.sender.displayName.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.senderName}>{item.message.sender.displayName}</Text>
              </View>
              <Text style={styles.time}>{new Date(item.createdAt).toLocaleDateString("uz-UZ")}</Text>
            </View>
            <Text style={styles.messagePreview} numberOfLines={2}>{getMessagePreview(item.message)}</Text>
            <View style={styles.cardFooter}>
              {item.label && (
                <View style={styles.labelBadge}>
                  <Text style={styles.labelText}>🏷️ {item.label}</Text>
                </View>
              )}
              <Text style={styles.chatName}>💬 {item.message.conversation?.title ?? "Suhbat"}</Text>
            </View>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔖</Text>
            <Text style={styles.emptyTitle}>{tr("Xatcho'plar yo'q")}</Text>
            <Text style={styles.emptyHint}>{tr("Xabarlarni xatcho'plash uchun ularni bosib ushlab turing")}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  countText: { fontSize: 13, color: colors.textSecondary, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  senderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  senderAvatarText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  senderName: { fontSize: 14, fontWeight: "600", color: colors.text },
  time: { fontSize: 11, color: colors.textSecondary },
  messagePreview: { fontSize: 14, color: colors.text, marginBottom: 8, lineHeight: 20 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 8 },
  labelBadge: { backgroundColor: colors.primary + "15", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  labelText: { fontSize: 11, color: colors.primary, fontWeight: "500" },
  chatName: { fontSize: 11, color: colors.textSecondary },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
