import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { notifLogApi, NotifLogEntry } from "../../api/notifLog";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "NotificationLog">;

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  message: { icon: "💬", color: "#007AFF" },
  payment: { icon: "💰", color: "#34C759" },
  call: { icon: "📞", color: "#5856D6" },
  system: { icon: "🔔", color: "#FF9500" },
  gift: { icon: "🎁", color: "#FF2D55" },
  badge: { icon: "🏅", color: "#AF52DE" },
  referral: { icon: "👥", color: "#00C7BE" },
  default: { icon: "📩", color: "#8E8E93" },
};

export function NotificationLogScreen(_props: Props) {
  const [items, setItems] = useState<NotifLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    notifLogApi.getAll().then((r) => {
      setItems(r.notifications);
      setNextCursor(r.nextCursor);
    }).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    notifLogApi.getAll().then((r) => { setItems(r.notifications); setNextCursor(r.nextCursor); }).catch(() => {}).finally(() => setRefreshing(false));
  }, []);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await notifLogApi.getAll(nextCursor);
      setItems((prev) => [...prev, ...r.notifications]);
      setNextCursor(r.nextCursor);
    } catch {}
    setLoadingMore(false);
  };

  const markAllRead = async () => {
    await notifLogApi.markAllAsRead().catch(() => {});
    setItems((prev) => prev.map((i) => ({ ...i, isRead: true })));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message={tr("Bildirishnomalarni yuklab bo'lmadi")} onRetry={loadData} />;
  }

  const unreadCount = items.filter((i) => !i.isRead).length;

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead} activeOpacity={0.7}>
          <Text style={styles.markAllText}>✓ Barchasini o'qilgan deb belgilash ({unreadCount})</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.default;
          return (
            <TouchableOpacity
              style={[styles.notifCard, !item.isRead && styles.unread]}
              activeOpacity={0.7}
              onPress={async () => {
                if (!item.isRead) {
                  await notifLogApi.markAsRead(item.id).catch(() => {});
                  setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isRead: true } : i));
                }
              }}
            >
              <View style={[styles.notifIconContainer, { backgroundColor: config.color + "15" }]}>
                <Text style={styles.notifIcon}>{config.icon}</Text>
              </View>
              <View style={styles.notifInfo}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
                <Text style={styles.notifDate}>{new Date(item.createdAt).toLocaleString("uz-UZ")}</Text>
              </View>
              {!item.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          );
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 16 }} color={colors.primary} /> : null}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>{tr("Bildirishnomalar yo'q")}</Text>
            <Text style={styles.emptyHint}>{tr("Yangi bildirishnomalar shu yerda ko'rinadi")}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  markAllBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  markAllText: { fontSize: 14, fontWeight: "600", color: colors.primary, textAlign: "center" },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 6,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  unread: { backgroundColor: "#007AFF" + "08" },
  notifIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  notifIcon: { fontSize: 18 },
  notifInfo: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: "600", color: colors.text },
  notifBody: { fontSize: 13, color: colors.textSecondary, marginTop: 2, lineHeight: 18 },
  notifDate: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
