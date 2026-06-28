import React, { useCallback, useState, useRef } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform, Alert, RefreshControl,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../navigation/types";
import { feedApi, PostComment } from "../../api/feed";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "PostComments">;

export function PostCommentsScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const userId = useAuthStore((s) => s.user?.id);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const loadComments = useCallback(async () => {
    setError(false);
    try {
      const result = await feedApi.getComments(postId);
      setComments(result.comments);
    } catch {
      setError(true);
    }
  }, [postId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadComments().finally(() => setLoading(false));
    }, [loadComments])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { const result = await feedApi.getComments(postId); setComments(result.comments); } catch {}
    setRefreshing(false);
  }, [postId]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      const comment = await feedApi.addComment(postId, text.trim());
      setComments((prev) => [...prev, comment]);
      setText("");
    } catch {
      Alert.alert("Xatolik", "Izoh qo'shib bo'lmadi");
    }
    setSending(false);
  };

  const handleDelete = async (commentId: string) => {
    try {
      await feedApi.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      Alert.alert("Xatolik", "Izohni o'chirib bo'lmadi");
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Hozir";
    if (mins < 60) return `${mins} daq`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} soat`;
    return d.toLocaleDateString("uz-UZ");
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <ErrorView message="Izohlarni yuklab bo'lmadi" onRetry={() => { setLoading(true); loadComments().finally(() => setLoading(false)); }} />
      ) : (
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.commentRow}>
              <Avatar uri={item.user.avatarUrl} name={item.user.displayName} size={32} />
              <View style={{ flex: 1 }}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentUser}>{item.user.displayName}</Text>
                  <Text style={styles.commentDate}>{formatDate(item.createdAt)}</Text>
                </View>
                <Text style={styles.commentContent}>{item.content}</Text>
              </View>
              {item.userId === userId && (
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Text style={{ color: colors.danger, fontSize: 16 }}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Izohlar yo'q</Text>
            </View>
          }
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Izoh yozing..."
          placeholderTextColor={colors.textSecondary}
          value={text}
          onChangeText={setText}
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendText}>→</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary },
  list: { padding: 16 },
  commentRow: { flexDirection: "row", marginBottom: 16, gap: 10, alignItems: "flex-start" },
  commentHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  commentUser: { fontSize: 13, fontWeight: "600", color: colors.text },
  commentDate: { fontSize: 11, color: colors.textSecondary },
  commentContent: { fontSize: 14, color: colors.text, marginTop: 2, lineHeight: 20 },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: { backgroundColor: colors.primary, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { color: "#fff", fontSize: 18, fontWeight: "600" },
});
