import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { forumsApi, ForumTopic } from "../../api/forums";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "ForumTopics">;

export function ForumTopicsScreen({ route, navigation }: Props) {
  const { conversationId } = route.params;
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    forumsApi.listTopics(conversationId).then(setTopics).catch(() => setError(true)).finally(() => setLoading(false));
  }, [conversationId]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    forumsApi.listTopics(conversationId).then(setTopics).catch(() => {}).finally(() => setRefreshing(false));
  }, [conversationId]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const topic = await forumsApi.createTopic(conversationId, { title: newTitle.trim() });
      setTopics((prev) => [topic, ...prev]);
      setNewTitle("");
      setShowCreate(false);
    } catch {
      Alert.alert("Xatolik", "Mavzu yaratib bo'lmadi");
    }
    setCreating(false);
  };

  const handleTogglePin = async (topic: ForumTopic) => {
    try {
      const updated = await forumsApi.updateTopic(conversationId, topic.id, { isPinned: !topic.isPinned });
      setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      Alert.alert("Xatolik", "Mavzuni o'zgartirib bo'lmadi");
    }
  };

  const handleToggleClose = async (topic: ForumTopic) => {
    try {
      const updated = await forumsApi.updateTopic(conversationId, topic.id, { isClosed: !topic.isClosed });
      setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      Alert.alert("Xatolik", "Mavzuni o'zgartirib bo'lmadi");
    }
  };

  const handleDelete = (topic: ForumTopic) => {
    Alert.alert("O'chirish", `"${topic.title}" mavzusini o'chirmoqchimisiz?`, [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          try {
            await forumsApi.deleteTopic(conversationId, topic.id);
            setTopics((prev) => prev.filter((t) => t.id !== topic.id));
          } catch {
            Alert.alert("Xatolik", "Mavzuni o'chirib bo'lmadi");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message="Mavzularni yuklab bo'lmadi" onRetry={loadData} />;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(!showCreate)} activeOpacity={0.7}>
        <Text style={styles.createBtnText}>{showCreate ? "Bekor qilish" : "+ Yangi mavzu"}</Text>
      </TouchableOpacity>

      {showCreate && (
        <View style={styles.createForm}>
          <TextInput
            style={styles.input}
            placeholder="Mavzu nomi..."
            placeholderTextColor={colors.textSecondary}
            value={newTitle}
            onChangeText={setNewTitle}
            maxLength={100}
          />
          <TouchableOpacity
            style={[styles.submitBtn, (!newTitle.trim() || creating) && styles.submitBtnDisabled]}
            onPress={handleCreate}
            disabled={!newTitle.trim() || creating}
            activeOpacity={0.7}
          >
            {creating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Yaratish</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        keyboardShouldPersistTaps="handled"
        data={topics}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.topicCard, item.isPinned && styles.pinnedCard]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("ChatRoom", {
              conversationId,
              title: item.title,
              highlightMessageId: undefined,
            })}
            onLongPress={() => {
              Alert.alert(item.title, undefined, [
                { text: item.isPinned ? "Olib tashlash" : "Qadash", onPress: () => handleTogglePin(item) },
                { text: item.isClosed ? "Ochish" : "Yopish", onPress: () => handleToggleClose(item) },
                { text: "O'chirish", style: "destructive", onPress: () => handleDelete(item) },
                { text: "Bekor qilish", style: "cancel" },
              ]);
            }}
          >
            <View style={styles.topicIconBg}>
              <Text style={styles.topicEmoji}>{item.iconEmoji || "💬"}</Text>
            </View>
            <View style={styles.topicInfo}>
              <View style={styles.topicTitleRow}>
                <Text style={styles.topicTitle} numberOfLines={1}>{item.title}</Text>
                {item.isPinned && <Text style={styles.badge}>📌</Text>}
                {item.isClosed && <Text style={styles.badge}>🔒</Text>}
              </View>
              <Text style={styles.topicMeta}>
                {item.creator?.displayName} · {item.messageCount} xabar
                {item.lastMessageAt && ` · ${new Date(item.lastMessageAt).toLocaleDateString("uz-UZ")}`}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>Mavzular yo'q</Text>
            <Text style={styles.emptyHint}>Muhokama uchun birinchi mavzuni yarating</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  createBtn: {
    margin: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  createBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  createForm: { marginHorizontal: 12, marginBottom: 8, gap: 8 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  topicCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  pinnedCard: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  topicIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
  },
  topicEmoji: { fontSize: 22 },
  topicInfo: { flex: 1 },
  topicTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  topicTitle: { fontSize: 16, fontWeight: "600", color: colors.text, flex: 1 },
  badge: { fontSize: 12 },
  topicMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  emptyContainer: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: colors.text, marginBottom: 6 },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
});
