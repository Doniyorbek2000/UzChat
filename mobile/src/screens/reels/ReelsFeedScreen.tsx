import React, { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Dimensions } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { reelsApi, Reel } from "../../api/reels";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ReelsFeed">;

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 36) / 2;

export function ReelsFeedScreen({ navigation }: Props) {
  const [tab, setTab] = useState<"feed" | "trending">("feed");
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = tab === "trending" ? await reelsApi.getTrending() : await reelsApi.getFeed();
      setReels(data);
    } catch {}
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  const renderReel = ({ item }: { item: Reel }) => (
    <TouchableOpacity style={styles.reelCard}>
      {item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Text style={styles.playIcon}>▶️</Text>
        </View>
      )}
      <View style={styles.reelOverlay}>
        <View style={styles.reelStats}>
          <Text style={styles.statText}>▶ {formatCount(item.viewCount)}</Text>
          <Text style={styles.statText}>❤ {formatCount(item.likeCount)}</Text>
        </View>
      </View>
      <View style={styles.reelInfo}>
        <Text style={styles.reelAuthor} numberOfLines={1}>{item.author.displayName}</Text>
        {item.caption && <Text style={styles.reelCaption} numberOfLines={2}>{item.caption}</Text>}
        {item.musicTitle && (
          <Text style={styles.reelMusic} numberOfLines={1}>🎵 {item.musicTitle}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === "feed" && styles.tabActive]}
            onPress={() => setTab("feed")}
          >
            <Text style={[styles.tabText, tab === "feed" && styles.tabTextActive]}>Yangilar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === "trending" && styles.tabActive]}
            onPress={() => setTab("trending")}
          >
            <Text style={[styles.tabText, tab === "trending" && styles.tabTextActive]}>Trendlar</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.createFab}
          onPress={() => navigation.navigate("CreateReel")}
        >
          <Text style={styles.createFabText}>+</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item) => item.id}
          renderItem={renderReel}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎬</Text>
              <Text style={styles.emptyText}>Hali reellar yo'q</Text>
              <Text style={styles.emptyHint}>Birinchi bo'lib reel yarating!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#111" },
  tabs: { flex: 1, flexDirection: "row", gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  tabActive: { backgroundColor: "#333" },
  tabText: { fontSize: 14, fontWeight: "600", color: "#888" },
  tabTextActive: { color: "#fff" },
  createFab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  createFabText: { fontSize: 20, fontWeight: "700", color: "#fff" },
  loader: { marginTop: 40 },
  list: { padding: 8, paddingBottom: 20 },
  row: { justifyContent: "space-between", paddingHorizontal: 4 },
  reelCard: {
    width: CARD_WIDTH,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "#1C1C1E",
  },
  thumbnail: { width: "100%", aspectRatio: 9 / 16, backgroundColor: "#222" },
  thumbnailPlaceholder: { alignItems: "center", justifyContent: "center" },
  playIcon: { fontSize: 32 },
  reelOverlay: {
    position: "absolute",
    bottom: 70,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
  },
  reelStats: { flexDirection: "row", gap: 8 },
  statText: { fontSize: 11, color: "#fff", fontWeight: "600", textShadowColor: "#000", textShadowRadius: 2 },
  reelInfo: { padding: 8 },
  reelAuthor: { fontSize: 13, fontWeight: "600", color: "#fff" },
  reelCaption: { fontSize: 11, color: "#ccc", marginTop: 2 },
  reelMusic: { fontSize: 10, color: "#aaa", marginTop: 2 },
  emptyContainer: { alignItems: "center", paddingTop: 80 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#fff", marginTop: 12 },
  emptyHint: { fontSize: 13, color: "#888", marginTop: 4 },
});
