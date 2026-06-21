import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { hashtagsApi } from "../../api/hashtags";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "HashtagPosts">;

export function HashtagPostsScreen({ route }: Props) {
  const { tag } = route.params;
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    hashtagsApi.getPostsByTag(tag).then((r) => {
      setPosts(r.posts);
      setNextCursor(r.nextCursor);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [tag]);

  const loadMore = async () => {
    if (!nextCursor) return;
    const r = await hashtagsApi.getPostsByTag(tag, nextCursor).catch(() => null);
    if (r) {
      setPosts((prev) => [...prev, ...r.posts]);
      setNextCursor(r.nextCursor);
    }
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
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
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <View style={styles.postAvatar}>
                <Text style={styles.postAvatarText}>{item.user?.displayName?.charAt(0) ?? "?"}</Text>
              </View>
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
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>#</Text>
            <Text style={styles.emptyText}>Postlar topilmadi</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F2F2F7" },
  header: { backgroundColor: colors.primary, padding: 20, alignItems: "center" },
  hashtagText: { fontSize: 24, fontWeight: "800", color: "#fff" },
  postCount: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  list: { padding: 12, paddingBottom: 20 },
  postCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 8 },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  postAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  postAvatarText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  postAuthor: { fontSize: 14, fontWeight: "600", color: "#333" },
  postDate: { fontSize: 11, color: "#888" },
  postContent: { fontSize: 14, color: "#333", lineHeight: 20, marginBottom: 8 },
  postStats: { flexDirection: "row", gap: 16 },
  statText: { fontSize: 12, color: "#888" },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, color: "#ccc", fontWeight: "800" },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#333", marginTop: 12 },
});
