import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from "react-native";
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

  const renderStream = ({ item }: { item: LiveStream }) => (
    <TouchableOpacity
      style={styles.streamCard}
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
            <Text style={styles.liveBadgeText}>JONLI</Text>
          </View>
        )}
        <Text style={styles.viewerCount}>👁 {item.viewerCount.toLocaleString()}</Text>
      </View>
      <View style={styles.streamInfo}>
        <Text style={styles.streamTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.streamHost}>{item.host?.displayName}</Text>
        {item.status === "SCHEDULED" && item.scheduledFor && (
          <Text style={styles.scheduledTime}>
            📅 {new Date(item.scheduledFor).toLocaleDateString("uz-UZ")}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === "active" && styles.tabActive]} onPress={() => setTab("active")}>
          <Text style={[styles.tabText, tab === "active" && styles.tabTextActive]}>Jonli efir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === "scheduled" && styles.tabActive]} onPress={() => setTab("scheduled")}>
          <Text style={[styles.tabText, tab === "scheduled" && styles.tabTextActive]}>Rejalashtirilgan</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : error ? (
        <ErrorView message="Jonli efirlarni yuklab bo'lmadi" onRetry={load} />
      ) : (
        <FlatList
          data={streams}
          keyExtractor={(item) => item.id}
          renderItem={renderStream}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📡</Text>
              <Text style={styles.emptyText}>Hozircha jonli efirlar yo'q</Text>
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
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: "#E5E5EA", alignItems: "center" },
  tabActive: { backgroundColor: "#FF3B30" },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  tabTextActive: { color: "#fff" },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  streamCard: { backgroundColor: colors.surface, borderRadius: 14, marginBottom: 12, overflow: "hidden" },
  thumbnail: { width: "100%", height: 180, backgroundColor: "#1C1C1E" },
  thumbnailPlaceholder: { alignItems: "center", justifyContent: "center" },
  liveIcon: { fontSize: 40 },
  overlay: { position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", justifyContent: "space-between" },
  liveBadge: { backgroundColor: "#FF3B30", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  liveBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  viewerCount: { fontSize: 12, color: "#fff", fontWeight: "600", textShadowColor: "#000", textShadowRadius: 3 },
  streamInfo: { padding: 14 },
  streamTitle: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 4 },
  streamHost: { fontSize: 13, color: colors.textSecondary },
  scheduledTime: { fontSize: 12, color: "#FF9500", marginTop: 4 },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 12 },
});
