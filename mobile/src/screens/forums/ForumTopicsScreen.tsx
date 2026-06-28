import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { forumsApi, ForumTopic } from "../../api/forums";
import { colors } from "../../theme/colors";
import { ErrorView } from "../../components";

type Props = NativeStackScreenProps<RootStackParamList, "ForumTopics">;

export function ForumTopicsScreen({ route }: Props) {
  const { conversationId } = route.params;
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(false);
    forumsApi.listTopics(conversationId).then(setTopics).catch(() => setError(true)).finally(() => setLoading(false));
  }, [conversationId]);

  useEffect(() => { loadData(); }, [loadData]);

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
    } catch {}
  };

  const handleToggleClose = async (topic: ForumTopic) => {
    try {
      const updated = await forumsApi.updateTopic(conversationId, topic.id, { isClosed: !topic.isClosed });
      setTopics((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {}
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
          } catch {}
        },
      },
    ]);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: "center" }} />;
  }

  if (error) {
    return <ErrorView message="Mavzularni yuklab bo'lmadi" onRetry={loadData} />;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(!showCreate)}>
        <Text style={styles.createBtnText}>{showCreate ? "Bekor qilish" : "+ Yangi mavzu"}</Text>
      </TouchableOpacity>

      {showCreate && (
        <View style={styles.createForm}>
          <TextInput
            style={styles.input}
            placeholder="Mavzu nomi..."
            placeholderTextColor="#999"
            value={newTitle}
            onChangeText={setNewTitle}
            maxLength={100}
          />
          <TouchableOpacity
            style={[styles.submitBtn, (!newTitle.trim() || creating) && styles.submitBtnDisabled]}
            onPress={handleCreate}
            disabled={!newTitle.trim() || creating}
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
        data={topics}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.topicCard, item.isPinned && styles.pinnedCard]}
            onLongPress={() => {
              Alert.alert(item.title, undefined, [
                { text: item.isPinned ? "Olib tashlash" : "Qadash", onPress: () => handleTogglePin(item) },
                { text: item.isClosed ? "Ochish" : "Yopish", onPress: () => handleToggleClose(item) },
                { text: "O'chirish", style: "destructive", onPress: () => handleDelete(item) },
                { text: "Bekor qilish", style: "cancel" },
              ]);
            }}
          >
            <View style={styles.topicHeader}>
              <Text style={styles.topicEmoji}>{item.iconEmoji || "💬"}</Text>
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
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>Mavzular yo'q</Text>
            <Text style={styles.emptyHint}>Muhokama uchun birinchi mavzuni yarating</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  createBtn: { margin: 12, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  createBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  createForm: { marginHorizontal: 12, marginBottom: 8, gap: 8 },
  input: { backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.text },
  submitBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  topicCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 14, marginBottom: 8 },
  pinnedCard: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  topicHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  topicEmoji: { fontSize: 28 },
  topicInfo: { flex: 1 },
  topicTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  topicTitle: { fontSize: 16, fontWeight: "600", color: colors.text, flex: 1 },
  badge: { fontSize: 12 },
  topicMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  emptyContainer: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, fontWeight: "600", color: colors.text, marginTop: 12 },
  emptyHint: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
});
