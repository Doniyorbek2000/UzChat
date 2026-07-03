import React, { useCallback, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  Image, RefreshControl,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/types";
import { feedApi, Post } from "../../api/feed";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "UserPosts">;

export function UserPostsScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPosts = useCallback(async (cursor?: string) => {
    try {
      const result = await feedApi.getUserPosts(userId, cursor);
      if (cursor) {
        setPosts((prev) => [...prev, ...result.posts]);
      } else {
        setPosts(result.posts);
      }
      setNextCursor(result.nextCursor);
      setError(false);
    } catch {
      if (!cursor) setError(true);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadPosts().finally(() => setLoading(false));
    }, [loadPosts])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const toggleLike = async (post: Post) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, isLiked: !p.isLiked, _count: { ...p._count, likes: p._count.likes + (p.isLiked ? -1 : 1) } }
          : p
      )
    );
    try {
      if (post.isLiked) {
        await feedApi.unlikePost(post.id);
      } else {
        await feedApi.likePost(post.id);
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, isLiked: post.isLiked, _count: { ...p._count, likes: post._count.likes } }
            : p
        )
      );
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Hozir";
    if (mins < 60) return `${mins} daqiqa oldin`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} soat oldin`;
    return d.toLocaleDateString("uz-UZ");
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (error) {
    return <ErrorView message={tr("Postlarni yuklab bo'lmadi")} onRetry={() => { setLoading(true); loadPosts().finally(() => setLoading(false)); }} />;
  }

  return (
    <FlatList
      style={styles.container}
      data={posts}
      keyExtractor={(item) => item.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      onEndReached={() => {
        if (nextCursor && !loadingMore) {
          setLoadingMore(true);
          loadPosts(nextCursor).finally(() => setLoadingMore(false));
        }
      }}
      onEndReachedThreshold={0.5}
      renderItem={({ item }) => (
        <View style={styles.postCard}>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          {item.content && <Text style={styles.content}>{item.content}</Text>}
          {item.mediaUrls.length > 0 && (
            <View style={styles.mediaContainer}>
              {item.mediaUrls.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.mediaImage} resizeMode="cover" />
              ))}
            </View>
          )}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(item)}>
              <Text style={[styles.actionIcon, item.isLiked && { color: colors.danger }]}>
                {item.isLiked ? "♥" : "♡"}
              </Text>
              <Text style={styles.actionCount}>{item._count.likes}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate("PostComments", { postId: item.id })}
            >
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionCount}>{item._count.comments}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 16 }} color={colors.primary} /> : null}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>{tr("Postlar yo'q")}</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary },
  postCard: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  date: { fontSize: 12, color: colors.textSecondary, marginBottom: 6 },
  content: { fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: 8 },
  mediaContainer: { marginBottom: 8 },
  mediaImage: { width: "100%", height: 200, borderRadius: 10, marginBottom: 4 },
  actions: { flexDirection: "row", gap: 20, paddingTop: 4 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionIcon: { fontSize: 18 },
  actionCount: { fontSize: 13, color: colors.textSecondary },
});
