import React, { useCallback, useState } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  Image, RefreshControl, Alert, Share,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/types";
import { feedApi, Post } from "../../api/feed";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Feed">;

export function FeedScreen({ navigation }: Props) {
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate("CreatePost")} style={{ marginRight: 8 }}>
          <Text style={{ color: colors.primary, fontSize: 28, fontWeight: "300" }}>+</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const userId = useAuthStore((s) => s.user?.id);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadPosts = useCallback(async (cursor?: string) => {
    try {
      const result = await feedApi.getFeed(cursor);
      if (cursor) {
        setPosts((prev) => [...prev, ...result.posts]);
      } else {
        setPosts(result.posts);
      }
      setNextCursor(result.nextCursor);
    } catch {}
  }, []);

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
    try {
      if (post.isLiked) {
        await feedApi.unlikePost(post.id);
      } else {
        await feedApi.likePost(post.id);
      }
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? { ...p, isLiked: !p.isLiked, _count: { ...p._count, likes: p._count.likes + (p.isLiked ? -1 : 1) } }
            : p
        )
      );
    } catch {}
  };

  const deletePost = (postId: string) => {
    Alert.alert("O'chirish", "Postni o'chirishni xohlaysizmi?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish", style: "destructive",
        onPress: async () => {
          try {
            await feedApi.deletePost(postId);
            setPosts((prev) => prev.filter((p) => p.id !== postId));
          } catch {}
        },
      },
    ]);
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
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} kun oldin`;
    return d.toLocaleDateString("uz-UZ");
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <TouchableOpacity
        style={styles.postHeader}
        onPress={() => navigation.navigate("UserProfile", { userId: item.userId })}
      >
        <Avatar uri={item.user.avatarUrl} name={item.user.displayName} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={styles.displayName}>{item.user.displayName}</Text>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        </View>
        {item.userId === userId && (
          <TouchableOpacity onPress={() => deletePost(item.id)}>
            <Text style={{ color: colors.danger, fontSize: 18 }}>×</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {item.content && <Text style={styles.postContent}>{item.content}</Text>}

      {item.mediaUrls.length > 0 && (
        <View style={styles.mediaContainer}>
          {item.mediaUrls.map((url, i) => (
            <Image key={i} source={{ uri: url }} style={styles.mediaImage} resizeMode="cover" />
          ))}
        </View>
      )}

      <View style={styles.postActions}>
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

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => Share.share({ message: item.content || "UzChat'dagi postni ko'ring!" }).catch(() => {})}
        >
          <Text style={styles.actionIcon}>📤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={renderPost}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      onEndReached={() => nextCursor && loadPosts(nextCursor)}
      onEndReachedThreshold={0.5}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>Hali postlar yo'q</Text>
          <Text style={styles.emptySubText}>Birinchi postingizni yarating!</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text },
  emptySubText: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  postCard: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: 16,
  },
  postHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10, gap: 10 },
  displayName: { fontSize: 15, fontWeight: "600", color: colors.text },
  date: { fontSize: 12, color: colors.textSecondary },
  postContent: { fontSize: 15, color: colors.text, lineHeight: 22, marginBottom: 10 },
  mediaContainer: { marginBottom: 10 },
  mediaImage: { width: "100%", height: 250, borderRadius: 10, marginBottom: 6 },
  postActions: { flexDirection: "row", gap: 20, paddingTop: 8 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionIcon: { fontSize: 20 },
  actionCount: { fontSize: 14, color: colors.textSecondary },
});
