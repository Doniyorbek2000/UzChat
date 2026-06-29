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
    const isLive = item.status === "LIVE";
    return (
      <TouchableOpacity
        style={styles.roomCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate("VoiceRoomView", { roomId: item.id })}
      >
        <View style={styles.roomHeader}>
          <View style={[styles.statusBadge, { backgroundColor: isLive ? colors.danger + "15" : "#FF9500" + "15" }]}>
            <View style={[styles.statusDot, { backgroundColor: isLive ? colors.danger : "#FF9500" }]} />
            <Text style={[styles.roomStatus, { color: isLive ? colors.danger : "#FF9500" }]}>
              {isLive ? "JONLI" : "REJALASHTIRILGAN"}
            </Text>
          </View>
        </View>
        <Text style={styles.roomTitle}>{item.title}</Text>
        <Text style={styles.roomHost}>👤 {item.host?.displayName}</Text>
        <View style={styles.roomStats}>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>🎤</Text>
            <Text style={styles.statText}>{speakerCount} so'zlovchi</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statIcon}>👂</Text>
            <Text style={styles.statText}>{item.listenerCount} tinglovchi</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.joinBtn} activeOpacity={0.7}>
          <Text style={styles.joinBtnText}>{isLive ? "Qo'shilish" : "Eslatma"}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === "live" && styles.tabActive]} onPress={() => setTab("live")}>
          <Text style={[styles.tabText, tab === "live" && styles.tabTextActive]}>🎙️ Jonli</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === "scheduled" && styles.tabActive]} onPress={() => setTab("scheduled")}>
          <Text style={[styles.tabText, tab === "scheduled" && styles.tabTextActive]}>📅 Rejalashtirilgan</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
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
              <Text style={styles.emptyTitle}>{tab === "live" ? "Jonli xonalar yo'q" : "Rejalashtirilgan xonalar yo'q"}</Text>
              <Text style={styles.emptyHint}>{tab === "live" ? "Yangi xonalar tez orada ochiladi" : "Kuzatib boring"}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  tabs: { flexDirection: "row", padding: 12, gap: 8, backgroundColor: colors.surface },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.background, alignItems: "center" },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: "#fff" },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  roomCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  roomHeader: { marginBottom: 8 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  roomStatus: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  roomTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 4 },
  roomHost: { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
  roomStats: { flexDirection: "row", gap: 16, marginBottom: 12 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statIcon: { fontSize: 14 },
  statText: { fontSize: 13, color: colors.textSecondary },
  joinBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  joinBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
