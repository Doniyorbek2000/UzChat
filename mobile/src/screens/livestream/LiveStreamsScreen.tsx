import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { liveStreamApi, LiveStream } from "../../api/livestream";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "LiveStreams">;

export function LiveStreamsScreen({ navigation }: Props) {
  const [tab, setTab] = useState<"active" | "scheduled">("active");
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = tab === "active" ? await liveStreamApi.listActive() : await liveStreamApi.listScheduled();
      setStreams(data);
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
      const data = tab === "active" ? await liveStreamApi.listActive() : await liveStreamApi.listScheduled();
      setStreams(data);
    } catch {}
    setRefreshing(false);
  }, [tab]);

  const renderStream = ({ item }: { item: LiveStream }) => (
    <TouchableOpacity
      style={styles.streamCard}
      activeOpacity={0.7}
      onPress={() => navigation.navigate("LiveStreamView", { streamId: item.id })}
    >
      {item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Text style={styles.liveIcon}>📡</Text>
        </View>
      )}
      <View style={styles.overlay}>
        {item.status === "LIVE" && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveBadgeText}>● JONLI</Text>
          </View>
        )}
        {item.status === "SCHEDULED" && (
          <View style={styles.scheduledBadge}>
            <Text style={styles.scheduledBadgeText}>📅 Rejalashtirilgan</Text>
          </View>
        )}
        <View style={styles.viewerBadge}>
          <Text style={styles.viewerText}>👁 {item.viewerCount.toLocaleString()}</Text>
        </View>
      </View>
      <View style={styles.streamInfo}>
        <Text style={styles.streamTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.streamHost}>{item.host?.displayName}</Text>
        {item.status === "SCHEDULED" && item.scheduledFor && (
          <Text style={styles.scheduledTime}>
            {new Date(item.scheduledFor).toLocaleDateString("uz-UZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === "active" && styles.tabActive]} onPress={() => setTab("active")}>
          <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>🔴 Jonli efir</Text>
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
        <ErrorView message="Jonli efirlarni yuklab bo'lmadi" onRetry={load} />
      ) : (
        <FlatList
          data={streams}
          keyExtractor={(item) => item.id}
          renderItem={renderStream}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>{tab === "active" ? "📡" : "📅"}</Text>
              <Text style={styles.emptyTitle}>{tab === "active" ? "Hozircha jonli efirlar yo'q" : "Rejalashtirilgan efirlar yo'q"}</Text>
              <Text style={styles.emptyHint}>{tab === "active" ? "Yangi efirlar tez orada boshlanadi" : "Kuzatib boring, yangi efirlar qo'shiladi"}</Text>
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
  tabActive: { backgroundColor: colors.danger },
  tabText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: "#fff" },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20 },
  streamCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  thumbnail: { width: "100%", height: 180, backgroundColor: "#1C1C1E" },
  thumbnailPlaceholder: { alignItems: "center", justifyContent: "center" },
  liveIcon: { fontSize: 40 },
  overlay: { position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between" },
  liveBadge: { backgroundColor: colors.danger, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  liveBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  scheduledBadge: { backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  scheduledBadgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  viewerBadge: { backgroundColor: "rgba(0,0,0,0.6)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  viewerText: { fontSize: 12, color: "#fff", fontWeight: "600" },
  streamInfo: { padding: 14 },
  streamTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 4 },
  streamHost: { fontSize: 13, color: colors.textSecondary },
  scheduledTime: { fontSize: 12, color: colors.warning, marginTop: 4, fontWeight: "500" },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
