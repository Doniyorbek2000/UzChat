import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Animated,
} from "react-native";
import { MainTabScreenProps } from "../../navigation/types";
import { reelsApi, Reel } from "../../api/reels";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";

type Props = MainTabScreenProps<"Reels">;

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = (width - 36) / 2;
const TAB_BAR_HEIGHT = 80;

export function ReelsFeedScreen({ navigation }: Props) {
  const [tab, setTab] = useState<"feed" | "trending">("feed");
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const heartScales = useRef<Record<string, Animated.Value>>({});

  const getHeartScale = (reelId: string) => {
    if (!heartScales.current[reelId]) {
      heartScales.current[reelId] = new Animated.Value(1);
    }
    return heartScales.current[reelId];
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = tab === "trending" ? await reelsApi.getTrending() : await reelsApi.getFeed();
      setReels(data);
      const liked = new Set<string>();
      data.forEach((r) => {
        if (r.likes && r.likes.length > 0) liked.add(r.id);
      });
      setLikedReels(liked);
    } catch {}
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = tab === "trending" ? await reelsApi.getTrending() : await reelsApi.getFeed();
      setReels(data);
    } catch {}
    setRefreshing(false);
  }, [tab]);

  const onToggleLike = async (reel: Reel) => {
    const wasLiked = likedReels.has(reel.id);
    const scale = getHeartScale(reel.id);

    setLikedReels((prev) => {
      const next = new Set(prev);
      if (wasLiked) {
        next.delete(reel.id);
      } else {
        next.add(reel.id);
      }
      return next;
    });
    setReels((prev) =>
      prev.map((r) =>
        r.id === reel.id ? { ...r, likeCount: r.likeCount + (wasLiked ? -1 : 1) } : r
      )
    );

    if (!wasLiked) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 50, bounciness: 15 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 10 }),
      ]).start();
    }

    try {
      await reelsApi.toggleLike(reel.id);
    } catch {
      setLikedReels((prev) => {
        const next = new Set(prev);
        if (wasLiked) {
          next.add(reel.id);
        } else {
          next.delete(reel.id);
        }
        return next;
      });
      setReels((prev) =>
        prev.map((r) =>
          r.id === reel.id ? { ...r, likeCount: r.likeCount + (wasLiked ? 1 : -1) } : r
        )
      );
    }
  };

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  };

  const renderReel = ({ item }: { item: Reel }) => {
    const isLiked = likedReels.has(item.id);
    const scale = getHeartScale(item.id);

    return (
      <View style={styles.reelCard}>
        <TouchableOpacity activeOpacity={0.9}>
          {item.thumbnailUrl ? (
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
          )}

          <View style={styles.reelGradient} />

          <View style={styles.reelActions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => onToggleLike(item)}>
              <Animated.Text
                style={[
                  styles.actionIcon,
                  isLiked && styles.actionIconLiked,
                  { transform: [{ scale }] },
                ]}
              >
                {isLiked ? "❤️" : "🤍"}
              </Animated.Text>
              <Text style={styles.actionCount}>{formatCount(item.likeCount)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionCount}>{formatCount(item.commentCount)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>📤</Text>
              <Text style={styles.actionCount}>{formatCount(item.shareCount)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.reelInfo}>
            <View style={styles.authorRow}>
              <Avatar uri={item.author.avatarUrl} name={item.author.displayName} size={24} />
              <Text style={styles.reelAuthor} numberOfLines={1}>
                {item.author.displayName}
              </Text>
            </View>
            {item.caption && (
              <Text style={styles.reelCaption} numberOfLines={2}>
                {item.caption}
              </Text>
            )}
            {item.musicTitle && (
              <Text style={styles.reelMusic} numberOfLines={1}>
                🎵 {item.musicTitle}
                {item.musicArtist ? ` — ${item.musicArtist}` : ""}
              </Text>
            )}
          </View>

          <View style={styles.viewCount}>
            <Text style={styles.viewCountText}>▶ {formatCount(item.viewCount)}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reels</Text>
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

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item) => item.id}
          renderItem={renderReel}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
              colors={[colors.primary]}
              progressBackgroundColor="#222"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎬</Text>
              <Text style={styles.emptyTitle}>Hali reellar yo'q</Text>
              <Text style={styles.emptyHint}>Birinchi bo'lib reel yarating!</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => navigation.navigate("CreateReel")}
              >
                <Text style={styles.emptyButtonText}>Reel yaratish</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#111",
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    marginRight: 16,
  },
  tabs: { flex: 1, flexDirection: "row", gap: 4 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
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
  list: { padding: 8, paddingBottom: TAB_BAR_HEIGHT },
  row: { justifyContent: "space-between", paddingHorizontal: 4 },
  reelCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 8,
    backgroundColor: "#1C1C1E",
  },
  thumbnail: { width: "100%", aspectRatio: 9 / 16, backgroundColor: "#222" },
  thumbnailPlaceholder: { alignItems: "center", justifyContent: "center" },
  playIcon: { fontSize: 36, color: "#fff", opacity: 0.7 },
  reelGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "transparent",
  },
  reelActions: {
    position: "absolute",
    right: 6,
    bottom: 70,
    alignItems: "center",
    gap: 12,
  },
  actionButton: { alignItems: "center" },
  actionIcon: { fontSize: 20 },
  actionIconLiked: { fontSize: 20 },
  actionCount: {
    fontSize: 10,
    color: "#fff",
    fontWeight: "600",
    marginTop: 2,
    textShadowColor: "#000",
    textShadowRadius: 3,
  },
  reelInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 36,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  reelAuthor: { fontSize: 13, fontWeight: "700", color: "#fff" },
  reelCaption: { fontSize: 11, color: "#ddd", marginTop: 2 },
  reelMusic: { fontSize: 10, color: "#bbb", marginTop: 3 },
  viewCount: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  viewCountText: { fontSize: 10, color: "#fff", fontWeight: "600" },
  emptyContainer: { alignItems: "center", paddingTop: 80 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#fff", marginTop: 16 },
  emptyHint: { fontSize: 14, color: "#888", marginTop: 8 },
  emptyButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});
