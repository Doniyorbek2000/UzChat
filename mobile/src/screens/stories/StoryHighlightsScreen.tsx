import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { highlightsApi, StoryHighlight } from "../../api/highlights";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "StoryHighlights">;

export function StoryHighlightsScreen({ route }: Props) {
  const { userId } = route.params;
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [highlights, setHighlights] = useState<StoryHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isOwner = userId === currentUserId;

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    highlightsApi.listByUser(userId).then(setHighlights).catch(() => setError(true)).finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    highlightsApi.listByUser(userId).then(setHighlights).catch(() => {}).finally(() => setRefreshing(false));
  }, [userId]);

  const handleDelete = (highlightId: string) => {
    Alert.alert("O'chirish", "Bu highlights'ni o'chirmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          try {
            await highlightsApi.delete(highlightId);
            setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
          } catch {}
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }

  if (error) {
    return <ErrorView message="Highlights yuklab bo'lmadi" onRetry={loadData} />;
  }

  const renderHighlight = ({ item }: { item: StoryHighlight }) => (
    <View style={styles.highlightCard}>
      <View style={styles.highlightHeader}>
        {item.coverUrl ? (
          <Image source={{ uri: item.coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={styles.coverEmoji}>📸</Text>
          </View>
        )}
        <View style={styles.highlightInfo}>
          <Text style={styles.highlightTitle}>{item.title}</Text>
          <Text style={styles.highlightMeta}>{item.items.length} element</Text>
        </View>
        {isOwner && (
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
            <Text style={styles.deleteBtnText}>🗑</Text>
          </TouchableOpacity>
        )}
      </View>
      {item.items.length > 0 && (
        <FlatList
          horizontal
          data={item.items}
          keyExtractor={(i) => i.id}
          renderItem={({ item: media }) => (
            <View style={styles.mediaItem}>
              <Image source={{ uri: media.mediaUrl }} style={styles.mediaImage} />
              {media.caption && <Text style={styles.mediaCaption} numberOfLines={1}>{media.caption}</Text>}
            </View>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.mediaList}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={highlights}
        keyExtractor={(item) => item.id}
        renderItem={renderHighlight}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💫</Text>
            <Text style={styles.emptyText}>Highlights mavjud emas</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  list: { padding: 12, paddingBottom: 20 },
  highlightCard: { backgroundColor: colors.surface, borderRadius: 14, marginBottom: 12, overflow: "hidden" },
  highlightHeader: { flexDirection: "row", padding: 14, alignItems: "center", gap: 12 },
  cover: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.primary },
  coverPlaceholder: { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  coverEmoji: { fontSize: 24 },
  highlightInfo: { flex: 1 },
  highlightTitle: { fontSize: 16, fontWeight: "600", color: colors.text },
  highlightMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontSize: 18 },
  mediaList: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  mediaItem: { width: 100 },
  mediaImage: { width: 100, height: 140, borderRadius: 10, backgroundColor: colors.background },
  mediaCaption: { fontSize: 11, color: colors.textSecondary, marginTop: 4, textAlign: "center" },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 12 },
});
