import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { authApi } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { Session } from "../../types";
import { formatDateTime } from "../../utils/conversation";
import { formatSessionDevice } from "../../utils/session";

export function ActiveSessionsScreen() {
  const logout = useAuthStore((s) => s.logout);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setError(false);
    return authApi
      .listSessions()
      .then(setSessions)
      .catch(() => setError(true));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onTerminate = (session: Session) => {
    Alert.alert("Seansni tugatish", "Ushbu qurilmadagi seansni tugatasizmi?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "Tugatish",
        style: "destructive",
        onPress: async () => {
          try {
            await authApi.revokeSession(session.id);
            if (session.isCurrent) {
              await logout();
              return;
            }
            setSessions((prev) => prev.filter((s) => s.id !== session.id));
          } catch (err: any) {
            const message = err?.response?.data?.error?.message;
            Alert.alert("Xatolik", message ?? "Seansni tugatib bo'lmadi");
          }
        },
      },
    ]);
  };

  const onTerminateOthers = () => {
    Alert.alert("Barcha boshqa seanslarni tugatish", "Joriy qurilmadan tashqari barcha seanslar tugatiladi", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "Tugatish",
        style: "destructive",
        onPress: async () => {
          try {
            await authApi.revokeOtherSessions();
            setSessions((prev) => prev.filter((s) => s.isCurrent));
          } catch (err: any) {
            const message = err?.response?.data?.error?.message;
            Alert.alert("Xatolik", message ?? "Seanslarni tugatib bo'lmadi");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message="Seanslarni yuklab bo'lmadi" onRetry={() => { setLoading(true); load().finally(() => setLoading(false)); }} />;
  }

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          otherSessionsCount > 0 ? (
            <TouchableOpacity style={styles.terminateAllRow} onPress={onTerminateOthers}>
              <Text style={styles.terminateAllText}>Barcha boshqa seanslarni tugatish</Text>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => onTerminate(item)}>
            <View style={styles.content}>
              <View style={styles.titleRow}>
                <Text style={styles.device}>{formatSessionDevice(item.userAgent)}</Text>
                {item.isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Joriy</Text>
                  </View>
                )}
              </View>
              <Text style={styles.meta}>So'nggi faollik: {formatDateTime(item.lastUsedAt)}</Text>
              <Text style={styles.meta}>Kirilgan: {formatDateTime(item.createdAt)}</Text>
            </View>
            <Text style={styles.terminateIcon}>{item.isCurrent ? "🚪" : "🗑"}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Faol seanslar topilmadi</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  content: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  device: { fontSize: 15, fontWeight: "600", color: colors.text },
  meta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  terminateIcon: { fontSize: 20 },
  currentBadge: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  currentBadgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 16 },
  terminateAllRow: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  terminateAllText: { color: colors.danger, fontWeight: "600", fontSize: 15 },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
});
