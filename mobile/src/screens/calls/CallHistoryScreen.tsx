import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { callsApi, CallLog } from "../../api/calls";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";

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
  const currentUser = useAuthStore((s) => s.user);

  const loadHistory = useCallback(async () => {
    try {
      const data = await callsApi.getHistory();
      setLogs(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={logs}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => {
          const isOutgoing = item.caller.id === currentUser?.id;
          const otherUser = isOutgoing ? item.receiver : item.caller;
          const isMissed = item.status === "MISSED" && !isOutgoing;

          return (
            <TouchableOpacity
              style={styles.row}
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
              <Avatar uri={otherUser.avatarUrl} name={otherUser.displayName} size={44} />
              <View style={styles.info}>
                <Text style={[styles.name, isMissed && styles.missedName]}>{otherUser.displayName}</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.direction}>{isOutgoing ? "↗" : "↙"}</Text>
                  <Text style={[styles.statusText, isMissed && styles.missedText]}>
                    {getStatusLabel(item.status, isOutgoing)}
                  </Text>
                  {item.duration > 0 && (
                    <Text style={styles.durationText}> · {formatDuration(item.duration)}</Text>
                  )}
                </View>
              </View>
              <View style={styles.rightCol}>
                <Text style={styles.callTypeIcon}>{item.callType === "video" ? "📹" : "📞"}</Text>
                <Text style={styles.dateText}>
                  {new Date(item.startedAt).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Hali qo'ng'iroqlar yo'q</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary, fontSize: 15 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 68 },
  row: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "500", color: colors.text },
  missedName: { color: colors.danger },
  detailRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  direction: { fontSize: 14, marginRight: 4 },
  statusText: { fontSize: 13, color: colors.textSecondary },
  missedText: { color: colors.danger },
  durationText: { fontSize: 13, color: colors.textSecondary },
  rightCol: { alignItems: "flex-end" },
  callTypeIcon: { fontSize: 20 },
  dateText: { fontSize: 11, color: colors.textSecondary, marginTop: 4 },
});
