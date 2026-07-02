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
  Modal,
  StatusBar,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
  Alert,
} from "react-native";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { MainTabScreenProps } from "../../navigation/types";
import { reelsApi, Reel, ReelComment } from "../../api/reels";
import { Avatar } from "../../components/Avatar";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";

type Props = MainTabScreenProps<"Reels">;

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = (width - 36) / 2;
const TAB_BAR_HEIGHT = 80;

export function ReelsFeedScreen({ navigation }: Props) {
  const [tab, setTab] = useState<"feed" | "trending">("feed");
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [likedReels, setLikedReels] = useState<Set<string>>(new Set());
  const [activeReel, setActiveReel] = useState<Reel | null>(null);
  const [videoPaused, setVideoPaused] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [commentReelId, setCommentReelId] = useState<string | null>(null);
  const [comments, setComments] = useState<ReelComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const videoRef = useRef<Video>(null);
  const heartScales = useRef<Record<string, Animated.Value>>({});

  const getHeartScale = (reelId: string) => {
    if (!heartScales.current[reelId]) {
      heartScales.current[reelId] = new Animated.Value(1);
    }
    return heartScales.current[reelId];
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = tab === "trending" ? await reelsApi.getTrending() : await reelsApi.getFeed();
      setReels(data);
      setHasMore(tab === "feed" && data.length >= 20);
      const liked = new Set<string>();
      data.forEach((r) => {
        if (r.likes && r.likes.length > 0) liked.add(r.id);
      });
      setLikedReels(liked);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  // Ranked feed pagination: the cursor is simply how many items we've loaded.
  const loadMore = useCallback(async () => {
    if (tab !== "feed" || loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const data = await reelsApi.getFeed(String(reels.length));
      setHasMore(data.length >= 20);
      setReels((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...data.filter((r) => !seen.has(r.id))];
      });
      setLikedReels((prev) => {
        const next = new Set(prev);
        data.forEach((r) => {
          if (r.likes && r.likes.length > 0) next.add(r.id);
        });
        return next;
      });
    } catch {}
    setLoadingMore(false);
  }, [tab, loadingMore, hasMore, loading, reels.length]);

  // Registers a (server-side deduplicated) view once the player opens.
  useEffect(() => {
    if (!activeReel) return;
    reelsApi.view(activeReel.id).catch(() => {});
  }, [activeReel?.id]);

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

  const openComments = async (reelId: string) => {
    setCommentReelId(reelId);
    setCommentsLoading(true);
    try {
      const data = await reelsApi.getComments(reelId);
      setComments(data);
    } catch {
      Alert.alert("Xatolik", "Izohlarni yuklab bo'lmadi");
    }
    setCommentsLoading(false);
  };

  const sendComment = async () => {
    if (!commentText.trim() || !commentReelId) return;
    setSendingComment(true);
    try {
      const comment = await reelsApi.addComment(commentReelId, { text: commentText.trim() });
      setComments((prev) => [...prev, comment]);
      setCommentText("");
      setReels((prev) =>
        prev.map((r) => r.id === commentReelId ? { ...r, commentCount: r.commentCount + 1 } : r)
      );
    } catch {
      Alert.alert("Xatolik", "Izoh yozib bo'lmadi");
    }
    setSendingComment(false);
  };

  const deleteComment = async (commentId: string) => {
    try {
      await reelsApi.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (commentReelId) {
        setReels((prev) =>
          prev.map((r) => r.id === commentReelId ? { ...r, commentCount: Math.max(0, r.commentCount - 1) } : r)
        );
      }
    } catch {
      Alert.alert("Xatolik", "Izohni o'chirib bo'lmadi");
    }
  };

  const shareReel = async (reel: Reel) => {
    try {
      await Share.share({
        message: reel.caption
          ? `${reel.author.displayName}: ${reel.caption}`
          : `${reel.author.displayName} ning reeli`,
      });
      const result = await reelsApi.share(reel.id).catch(() => null);
      setReels((prev) =>
        prev.map((r) =>
          r.id === reel.id ? { ...r, shareCount: result?.shareCount ?? r.shareCount + 1 } : r
        )
      );
    } catch {}
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
        <TouchableOpacity activeOpacity={0.9} onPress={() => setActiveReel(item)}>
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

            <TouchableOpacity style={styles.actionButton} onPress={() => openComments(item.id)}>
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionCount}>{formatCount(item.commentCount)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={() => shareReel(item)}>
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
            <Text style={[styles.tabText, tab === "feed" && styles.tabTextActive]}>Siz uchun</Text>
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
      ) : error ? (
        <ErrorView message="Reellarni yuklab bo'lmadi" onRetry={load} />
      ) : (
        <FlatList
          data={reels}
          keyExtractor={(item) => item.id}
          renderItem={renderReel}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={colors.primary} style={{ paddingVertical: 16 }} /> : null
          }
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

      <Modal visible={!!activeReel} animationType="slide" statusBarTranslucent>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <SafeAreaView style={styles.playerContainer}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => { setActiveReel(null); setVideoPaused(false); }}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {activeReel && (
            <>
              <TouchableOpacity
                activeOpacity={1}
                style={styles.videoTap}
                onPress={() => setVideoPaused((p) => !p)}
              >
                <Video
                  ref={videoRef}
                  source={{ uri: activeReel.videoUrl }}
                  style={styles.video}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={!videoPaused}
                  isLooping
                  useNativeControls={false}
                />
                {videoPaused && (
                  <View style={styles.pauseOverlay}>
                    <Text style={styles.pauseIcon}>▶</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.playerOverlay}>
                <View style={styles.playerActions}>
                  <TouchableOpacity style={styles.playerAction} onPress={() => activeReel && onToggleLike(activeReel)}>
                    <Text style={styles.playerActionIcon}>{likedReels.has(activeReel.id) ? "❤️" : "🤍"}</Text>
                    <Text style={styles.playerActionCount}>{formatCount(activeReel.likeCount)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.playerAction} onPress={() => openComments(activeReel.id)}>
                    <Text style={styles.playerActionIcon}>💬</Text>
                    <Text style={styles.playerActionCount}>{formatCount(activeReel.commentCount)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.playerAction} onPress={() => shareReel(activeReel)}>
                    <Text style={styles.playerActionIcon}>📤</Text>
                    <Text style={styles.playerActionCount}>{formatCount(activeReel.shareCount)}</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.playerInfo}>
                  <View style={styles.authorRow}>
                    <Avatar uri={activeReel.author.avatarUrl} name={activeReel.author.displayName} size={32} />
                    <Text style={styles.playerAuthor}>{activeReel.author.displayName}</Text>
                  </View>
                  {activeReel.caption && <Text style={styles.playerCaption}>{activeReel.caption}</Text>}
                  {activeReel.musicTitle && (
                    <Text style={styles.playerMusic}>🎵 {activeReel.musicTitle}{activeReel.musicArtist ? ` — ${activeReel.musicArtist}` : ""}</Text>
                  )}
                </View>
              </View>
            </>
          )}
        </SafeAreaView>
      </Modal>
      <Modal visible={!!commentReelId} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.commentOverlay}
        >
          <TouchableOpacity style={styles.commentDismiss} onPress={() => { setCommentReelId(null); setComments([]); setCommentText(""); }} />
          <View style={styles.commentSheet}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentHeaderTitle}>Izohlar</Text>
              <TouchableOpacity onPress={() => { setCommentReelId(null); setComments([]); setCommentText(""); }}>
                <Text style={styles.commentHeaderClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {commentsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 30 }} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.commentItem}
                    onLongPress={() => {
                      Alert.alert("Izoh", undefined, [
                        { text: "O'chirish", style: "destructive", onPress: () => deleteComment(item.id) },
                        { text: "Bekor qilish", style: "cancel" },
                      ]);
                    }}
                  >
                    <Avatar uri={item.author.avatarUrl} name={item.author.displayName} size={32} />
                    <View style={styles.commentBody}>
                      <Text style={styles.commentAuthor}>{item.author.displayName}</Text>
                      <Text style={styles.commentTextContent}>{item.text}</Text>
                      <Text style={styles.commentTime}>
                        {new Date(item.createdAt).toLocaleDateString("uz-UZ")}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                contentContainerStyle={styles.commentList}
                ListEmptyComponent={
                  <Text style={styles.commentEmpty}>Hali izohlar yo'q</Text>
                }
              />
            )}

            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Izoh yozing..."
                placeholderTextColor={colors.textSecondary}
                value={commentText}
                onChangeText={setCommentText}
                maxLength={500}
                multiline
              />
              <TouchableOpacity
                style={[styles.commentSendBtn, (!commentText.trim() || sendingComment) && { opacity: 0.4 }]}
                onPress={sendComment}
                disabled={!commentText.trim() || sendingComment}
              >
                {sendingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.commentSendText}>➤</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  tabText: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
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
  emptyHint: { fontSize: 14, color: colors.textSecondary, marginTop: 8 },
  emptyButton: {
    marginTop: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: { fontSize: 15, fontWeight: "600", color: "#fff" },
  playerContainer: { flex: 1, backgroundColor: "#000" },
  closeBtn: { position: "absolute", top: 50, left: 16, zIndex: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  closeBtnText: { fontSize: 18, color: "#fff", fontWeight: "700" },
  videoTap: { flex: 1, justifyContent: "center" },
  video: { width: "100%", height: "100%" },
  pauseOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" },
  pauseIcon: { fontSize: 56, color: "#fff", opacity: 0.8 },
  playerOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, paddingBottom: 40 },
  playerActions: { position: "absolute", right: 12, bottom: 80, alignItems: "center", gap: 20 },
  playerAction: { alignItems: "center" },
  playerActionIcon: { fontSize: 28 },
  playerActionCount: { fontSize: 12, color: "#fff", fontWeight: "600", marginTop: 4, textShadowColor: "#000", textShadowRadius: 4 },
  playerInfo: { padding: 16, paddingRight: 60 },
  playerAuthor: { fontSize: 16, fontWeight: "700", color: "#fff", marginLeft: 8 },
  playerCaption: { fontSize: 14, color: "#eee", marginTop: 6 },
  playerMusic: { fontSize: 12, color: colors.border, marginTop: 4 },
  commentOverlay: { flex: 1, justifyContent: "flex-end" },
  commentDismiss: { flex: 1 },
  commentSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: height * 0.65, paddingBottom: Platform.OS === "ios" ? 20 : 0 },
  commentHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  commentHeaderTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  commentHeaderClose: { fontSize: 18, color: colors.textSecondary, fontWeight: "700" },
  commentList: { paddingHorizontal: 16, paddingVertical: 8 },
  commentItem: { flexDirection: "row", gap: 10, marginBottom: 14 },
  commentBody: { flex: 1 },
  commentAuthor: { fontSize: 13, fontWeight: "600", color: colors.text },
  commentTextContent: { fontSize: 14, color: colors.text, marginTop: 2 },
  commentTime: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
  commentEmpty: { textAlign: "center", color: colors.textSecondary, paddingVertical: 30 },
  commentInputRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 0.5, borderTopColor: colors.border, gap: 8 },
  commentInput: { flex: 1, backgroundColor: colors.background, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: colors.text, maxHeight: 80 },
  commentSendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  commentSendText: { fontSize: 16, color: "#fff" },
});
