import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { bookmarksApi, Bookmark } from "../../api/bookmarks";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Bookmarks">;

export function BookmarksScreen({ navigation }: Props) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookmarksApi.list().then(setBookmarks).catch(() => {}).finally(() => setLoading(false));
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
          } catch {}
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
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
            <Text style={styles.messagePreview} numberOfLines={2}>{item.message.ciphertext}</Text>
            {item.label && <Text style={styles.label}>🏷️ {item.label}</Text>}
            <Text style={styles.chatName}>💬 {item.message.conversation?.title ?? "Suhbat"}</Text>
          </TouchableOpacity>
        )}
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
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  list: { padding: 12, paddingBottom: 20 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  senderName: { fontSize: 14, fontWeight: "600", color: "#333" },
  time: { fontSize: 11, color: "#999" },
  messagePreview: { fontSize: 14, color: "#555", marginBottom: 6 },
  label: { fontSize: 12, color: colors.primary, marginBottom: 4 },
  chatName: { fontSize: 11, color: "#888" },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#333", marginTop: 12 },
  emptyHint: { fontSize: 13, color: "#888", marginTop: 4 },
});
