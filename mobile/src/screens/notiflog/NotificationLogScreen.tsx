import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { notifLogApi, NotifLogEntry } from "../../api/notifLog";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "NotificationLog">;

const TYPE_ICONS: Record<string, string> = {
  message: "💬", payment: "💰", call: "📞", system: "🔔",
  gift: "🎁", badge: "🏅", referral: "👥", default: "📩",
};

export function NotificationLogScreen(_props: Props) {
  const [items, setItems] = useState<NotifLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    notifLogApi.getAll().then((r) => {
      setItems(r.notifications);
      setNextCursor(r.nextCursor);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const loadMore = async () => {
    if (!nextCursor) return;
    const r = await notifLogApi.getAll(nextCursor).catch(() => null);
    if (r) {
      setItems((prev) => [...prev, ...r.notifications]);
      setNextCursor(r.nextCursor);
    }
  };

  const markAllRead = async () => {
    await notifLogApi.markAllAsRead().catch(() => {});
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }

  return (
    <View style={styles.container}>
      {items.some((i) => !i.isRead) && (
        <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
          <Text style={styles.markAllText}>Barchasini o'qilgan deb belgilash</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.notifCard, !item.isRead && styles.unread]}
            onPress={async () => {
              if (!item.isRead) {
                await notifLogApi.markAsRead(item.id).catch(() => {});
                setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isRead: true } : i));
              }
            }}
          >
            <Text style={styles.notifIcon}>{TYPE_ICONS[item.type] ?? TYPE_ICONS.default}</Text>
            <View style={styles.notifInfo}>
              <Text style={styles.notifTitle}>{item.title}</Text>
              <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
              <Text style={styles.notifDate}>{new Date(item.createdAt).toLocaleString("uz-UZ")}</Text>
            </View>
            {!item.isRead && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyText}>Bildirishnomalar yo'q</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  markAllBtn: { padding: 12, alignItems: "center" },
  markAllText: { fontSize: 14, fontWeight: "600", color: colors.primary },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  notifCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 10, padding: 12, marginBottom: 4, gap: 10 },
  unread: { backgroundColor: "#F0F4FF" },
  notifIcon: { fontSize: 24 },
  notifInfo: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  notifBody: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  notifDate: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 12 },
});
