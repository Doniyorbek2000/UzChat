import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { chatExportApi, ChatExportData } from "../../api/chatExport";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "ChatExports">;

const STATUS_CONFIG = {
  completed: { label: "Tayyor", color: "#34C759" },
  processing: { label: "Jarayonda", color: "#FF9500" },
  pending: { label: "Kutilmoqda", color: "#8E8E93" },
};

export function ChatExportsScreen(_props: Props) {
  const [exports, setExports] = useState<ChatExportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    chatExportApi.list().then(setExports).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    chatExportApi.list().then(setExports).catch(() => {}).finally(() => setRefreshing(false));
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
          } catch {
            Alert.alert("Xatolik", "Eksportni o'chirib bo'lmadi");
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
    return <ErrorView message="Eksportlarni yuklab bo'lmadi" onRetry={loadData} />;
  }

  return (
    <View style={styles.container}>
      {exports.length > 0 && (
        <Text style={styles.countText}>{exports.length} ta eksport</Text>
      )}
      <FlatList
        data={exports}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const status = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
          return (
            <TouchableOpacity style={styles.card} activeOpacity={0.7} onLongPress={() => handleDelete(item)}>
              <View style={styles.cardIcon}>
                <Text style={styles.cardIconText}>📤</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <Text style={styles.chatName} numberOfLines={1}>{item.conversation?.title ?? "Suhbat"}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: status.color + "18" }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>{item.format.toUpperCase()}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaText}>{item.messageCount.toLocaleString()} xabar</Text>
                  {item.includeMedia && (
                    <>
                      <Text style={styles.metaDot}>·</Text>
                      <Text style={styles.metaText}>📎 Media</Text>
                    </>
                  )}
                </View>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString("uz-UZ")}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📤</Text>
            <Text style={styles.emptyTitle}>Eksportlar yo'q</Text>
            <Text style={styles.emptyHint}>Suhbatlarni eksport qilish uchun suhbat sozlamalariga o'ting</Text>
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
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#007AFF" + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconText: { fontSize: 20 },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  chatName: { fontSize: 15, fontWeight: "600", color: colors.text, flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  metaText: { fontSize: 12, color: colors.textSecondary },
  metaDot: { fontSize: 12, color: colors.textSecondary },
  date: { fontSize: 11, color: colors.textSecondary },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
