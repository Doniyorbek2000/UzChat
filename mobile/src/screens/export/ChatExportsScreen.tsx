import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { chatExportApi, ChatExportData } from "../../api/chatExport";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ChatExports">;

export function ChatExportsScreen(_props: Props) {
  const [exports, setExports] = useState<ChatExportData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chatExportApi.list().then(setExports).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleDelete = (item: ChatExportData) => {
    Alert.alert("O'chirish", "Bu eksportni o'chirmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          try {
            await chatExportApi.delete(item.id);
            setExports((prev) => prev.filter((e) => e.id !== item.id));
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
        data={exports}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onLongPress={() => handleDelete(item)}>
            <View style={styles.cardHeader}>
              <Text style={styles.chatName}>{item.conversation?.title ?? "Suhbat"}</Text>
              <View style={[styles.statusBadge, { backgroundColor: item.status === "completed" ? "#4CD964" : item.status === "processing" ? "#FF9500" : "#FF3B30" }]}>
                <Text style={styles.statusText}>
                  {item.status === "completed" ? "Tayyor" : item.status === "processing" ? "Jarayonda" : "Kutilmoqda"}
                </Text>
              </View>
            </View>
            <Text style={styles.meta}>
              {item.format.toUpperCase()} · {item.messageCount.toLocaleString()} xabar
              {item.includeMedia ? " · Media bilan" : ""}
            </Text>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString("uz-UZ")}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📤</Text>
            <Text style={styles.emptyText}>Eksportlar yo'q</Text>
            <Text style={styles.emptyHint}>Suhbatlarni eksport qilish uchun suhbat sozlamalariga o'ting</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  list: { padding: 12, paddingBottom: 20 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  chatName: { fontSize: 15, fontWeight: "600", color: "#333", flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  meta: { fontSize: 12, color: "#666", marginBottom: 4 },
  date: { fontSize: 11, color: "#999" },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#333", marginTop: 12 },
  emptyHint: { fontSize: 13, color: "#888", marginTop: 4 },
});
