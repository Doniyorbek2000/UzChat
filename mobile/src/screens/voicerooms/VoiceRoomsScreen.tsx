import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { voiceRoomsApi, VoiceRoom } from "../../api/voiceRooms";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "VoiceRooms">;

export function VoiceRoomsScreen({ navigation }: Props) {
  const [tab, setTab] = useState<"live" | "scheduled">("live");
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = tab === "live" ? await voiceRoomsApi.listLive() : await voiceRoomsApi.listScheduled();
      setRooms(data);
      setError(false);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = tab === "live" ? await voiceRoomsApi.listLive() : await voiceRoomsApi.listScheduled();
      setRooms(data);
    } catch {}
    setRefreshing(false);
  }, [tab]);

  const renderRoom = ({ item }: { item: VoiceRoom }) => {
    const speakerCount = item.participants?.filter((p) => p.role === "speaker").length ?? 0;
    return (
      <TouchableOpacity
        style={styles.roomCard}
        onPress={() => navigation.navigate("VoiceRoomView", { roomId: item.id })}
      >
        <View style={styles.roomHeader}>
          <View style={[styles.statusDot, { backgroundColor: item.status === "LIVE" ? "#FF3B30" : "#FF9500" }]} />
          <Text style={styles.roomStatus}>{item.status === "LIVE" ? "JONLI" : "REJALASHTIRILGAN"}</Text>
        </View>
        <Text style={styles.roomTitle}>{item.title}</Text>
        <Text style={styles.roomHost}>{item.host?.displayName}</Text>
        <View style={styles.roomStats}>
          <Text style={styles.roomStat}>🎤 {speakerCount} so'zlovchi</Text>
          <Text style={styles.roomStat}>👂 {item.listenerCount} tinglovchi</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === "live" && styles.tabActive]} onPress={() => setTab("live")}>
          <Text style={[styles.tabText, tab === "live" && styles.tabTextActive]}>Jonli</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === "scheduled" && styles.tabActive]} onPress={() => setTab("scheduled")}>
          <Text style={[styles.tabText, tab === "scheduled" && styles.tabTextActive]}>Rejalashtirilgan</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : error ? (
        <ErrorView message="Ovozli xonalarni yuklab bo'lmadi" onRetry={load} />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          renderItem={renderRoom}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎙️</Text>
              <Text style={styles.emptyText}>Hozircha ovozli xonalar yo'q</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  tabs: { flexDirection: "row", padding: 12, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.background, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: "#fff" },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  roomCard: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, marginBottom: 10 },
  roomHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  roomStatus: { fontSize: 11, fontWeight: "700", color: colors.textSecondary, letterSpacing: 0.5 },
  roomTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 4 },
  roomHost: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  roomStats: { flexDirection: "row", gap: 16 },
  roomStat: { fontSize: 12, color: colors.textSecondary },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 12 },
});
