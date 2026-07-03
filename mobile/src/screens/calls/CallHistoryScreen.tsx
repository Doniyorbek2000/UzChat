import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { callsApi, CallLog } from "../../api/calls";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { EmptyState } from "../../components/EmptyState";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "CallHistory">;

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getStatusLabel(status: CallLog["status"], isOutgoing: boolean): string {
  switch (status) {
    case "ANSWERED": return "Javob berildi";
    case "MISSED": return isOutgoing ? "Javob berilmadi" : "O'tkazib yuborildi";
    case "REJECTED": return "Rad etildi";
    case "BUSY": return "Band";
  }
}

export function CallHistoryScreen({ navigation }: Props) {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const currentUser = useAuthStore((s) => s.user);

  const loadHistory = useCallback(async () => {
    try {
      const data = await callsApi.getHistory();
      setLogs(data);
      setError(false);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  }, [loadHistory]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message={tr("Qo'ng'iroqlar tarixini yuklab bo'lmadi")} onRetry={() => { setLoading(true); loadHistory(); }} />;
  }

  return (
    <View style={styles.container}>
      {logs.length > 0 && (
        <Text style={styles.countText}>{logs.length} ta qo'ng'iroq</Text>
      )}
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={Separator}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isOutgoing = item.caller.id === currentUser?.id;
          const otherUser = isOutgoing ? item.receiver : item.caller;
          const isMissed = item.status === "MISSED" && !isOutgoing;

          return (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate("Call", {
                  userId: otherUser.id,
                  displayName: otherUser.displayName,
                  avatarUrl: otherUser.avatarUrl,
                  callType: item.callType as "audio" | "video",
                  isIncoming: false,
                })
              }
            >
              <Avatar uri={otherUser.avatarUrl} name={otherUser.displayName} size={46} />
              <View style={styles.info}>
                <Text style={[styles.name, isMissed && styles.missedName]}>{otherUser.displayName}</Text>
                <View style={styles.detailRow}>
                  <View style={[styles.directionBadge, { backgroundColor: isOutgoing ? "#007AFF" + "15" : "#34C759" + "15" }]}>
                    <Text style={[styles.directionText, { color: isOutgoing ? "#007AFF" : "#34C759" }]}>
                      {isOutgoing ? "↗" : "↙"}
                    </Text>
                  </View>
                  <Text style={[styles.statusText, isMissed && styles.missedText]}>
                    {getStatusLabel(item.status, isOutgoing)}
                  </Text>
                  {item.duration > 0 && (
                    <Text style={styles.durationText}> · {formatDuration(item.duration)}</Text>
                  )}
                </View>
              </View>
              <View style={styles.rightCol}>
                <View style={[styles.callTypeIcon, { backgroundColor: item.callType === "video" ? "#5856D6" + "15" : "#007AFF" + "15" }]}>
                  <Text style={styles.callTypeEmoji}>{item.callType === "video" ? "📹" : "📞"}</Text>
                </View>
                <Text style={styles.dateText}>
                  {new Date(item.startedAt).toLocaleDateString("uz-UZ", { day: "numeric", month: "short" })}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <EmptyState icon="📞" title={tr("Hali qo'ng'iroqlar yo'q")} subtitle={tr("Qo'ng'iroq qilish uchun kontaktni tanlang")} />
        }
      />
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  countText: { fontSize: 13, color: colors.textSecondary, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  list: { paddingBottom: 20 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 76 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600", color: colors.text },
  missedName: { color: colors.danger },
  detailRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 6 },
  directionBadge: { width: 20, height: 20, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  directionText: { fontSize: 12, fontWeight: "700" },
  statusText: { fontSize: 13, color: colors.textSecondary },
  missedText: { color: colors.danger },
  durationText: { fontSize: 13, color: colors.textSecondary },
  rightCol: { alignItems: "center", gap: 6 },
  callTypeIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  callTypeEmoji: { fontSize: 16 },
  dateText: { fontSize: 11, color: colors.textSecondary },
});
