import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert , RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { bookmarksApi, Bookmark } from "../../api/bookmarks";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

const MESSAGE_TYPE_LABELS: Record<string, { icon: string; label: string }> = {
  text: { icon: "💬", label: "Xabar" },
  image: { icon: "📷", label: "Rasm" },
  video: { icon: "🎬", label: "Video" },
  audio: { icon: "🎤", label: "Ovozli xabar" },
  voice: { icon: "🎤", label: "Ovozli xabar" },
  file: { icon: "📎", label: "Fayl" },
  document: { icon: "📄", label: "Hujjat" },
  location: { icon: "📍", label: "Joylashuv" },
  contact: { icon: "👤", label: "Kontakt" },
  sticker: { icon: "🎨", label: "Stiker" },
  gif: { icon: "🎞️", label: "GIF" },
  poll: { icon: "📊", label: "So'rovnoma" },
  reply: { icon: "↩️", label: "Javob" },
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
    Alert.alert("O'chirish", "Bu xatcho'pni o'chirmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          try {
            await bookmarksApi.remove(bookmark.id);
            setBookmarks((prev) => prev.filter((b) => b.id !== bookmark.id));
          } catch {
            Alert.alert("Xatolik", "Xatcho'pni o'chirib bo'lmadi");
          }
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }

  if (error) {
    return <ErrorView message="Xatcho'plarni yuklab bo'lmadi" onRetry={loadData} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={bookmarks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate("ChatRoom", {
              conversationId: item.message.conversationId,
              title: item.message.conversation?.title ?? "",
              highlightMessageId: item.messageId,
            })}
            onLongPress={() => handleRemove(item)}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.senderName}>{item.message.sender.displayName}</Text>
              <Text style={styles.time}>{new Date(item.createdAt).toLocaleDateString("uz-UZ")}</Text>
            </View>
            <Text style={styles.messagePreview} numberOfLines={2}>{getMessagePreview(item.message)}</Text>
            {item.label && <Text style={styles.label}>🏷️ {item.label}</Text>}
            <Text style={styles.chatName}>💬 {item.message.conversation?.title ?? "Suhbat"}</Text>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔖</Text>
            <Text style={styles.emptyText}>Xatcho'plar yo'q</Text>
            <Text style={styles.emptyHint}>Xabarlarni xatcho'plash uchun ularni bosib ushlab turing</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  list: { padding: 12, paddingBottom: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 8 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  senderName: { fontSize: 14, fontWeight: "600", color: colors.text },
  time: { fontSize: 11, color: colors.textSecondary },
  messagePreview: { fontSize: 14, color: colors.textSecondary, marginBottom: 6 },
  label: { fontSize: 12, color: colors.primary, marginBottom: 4 },
  chatName: { fontSize: 11, color: colors.textSecondary },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 12 },
  emptyHint: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
});
