import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/types";
import { hashtagsApi } from "../../api/hashtags";
import { Avatar } from "../../components/Avatar";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "HashtagPosts">;

export function HashtagPostsScreen({ route }: Props) {
  const { tag } = route.params;
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPosts = useCallback(async (cursor?: string) => {
    try {
      const r = await hashtagsApi.getPostsByTag(tag, cursor);
      if (cursor) {
        setPosts((prev) => [...prev, ...r.posts]);
      } else {
        setPosts(r.posts);
      }
      setNextCursor(r.nextCursor);
      setError(false);
    } catch {
      if (!cursor) setError(true);
    }
  }, [tag]);

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

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }

  if (error) {
    return <ErrorView message={tr("Postlarni yuklab bo'lmadi")} onRetry={() => { setLoading(true); loadPosts().finally(() => setLoading(false)); }} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.hashtagText}>#{tag}</Text>
        <Text style={styles.postCount}>{posts.length} ta post</Text>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <Avatar uri={item.user?.avatarUrl} name={item.user?.displayName ?? "?"} size={36} />
              <View>
                <Text style={styles.postAuthor}>{item.user?.displayName}</Text>
                <Text style={styles.postDate}>{new Date(item.createdAt).toLocaleDateString("uz-UZ")}</Text>
              </View>
            </View>
            {item.content && <Text style={styles.postContent}>{item.content}</Text>}
            <View style={styles.postStats}>
              <Text style={styles.statText}>❤️ {item._count?.likes ?? 0}</Text>
              <Text style={styles.statText}>💬 {item._count?.comments ?? 0}</Text>
            </View>
          </View>
        )}
        onEndReached={() => {
          if (nextCursor && !loadingMore) {
            setLoadingMore(true);
            loadPosts(nextCursor).finally(() => setLoadingMore(false));
          }
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.list}
        ListFooterComponent={loadingMore ? <ActivityIndicator style={{ padding: 16 }} color={colors.primary} /> : null}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>#</Text>
            <Text style={styles.emptyText}>{tr("Postlar topilmadi")}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { backgroundColor: colors.primary, padding: 20, alignItems: "center" },
  hashtagText: { fontSize: 24, fontWeight: "800", color: "#fff" },
  postCount: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  list: { padding: 12, paddingBottom: 20 },
  postCard: { backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 8 },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  postAuthor: { fontSize: 14, fontWeight: "600", color: colors.text },
  postDate: { fontSize: 11, color: colors.textSecondary },
  postContent: { fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 8 },
  postStats: { flexDirection: "row", gap: 16 },
  statText: { fontSize: 12, color: colors.textSecondary },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, color: colors.border, fontWeight: "800" },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 12 },
});
