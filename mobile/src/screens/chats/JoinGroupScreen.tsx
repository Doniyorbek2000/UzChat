import { useCallback, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore } from "../../store/chatStore";
import { chatsApi } from "../../api/chats";
import { decodeInviteLink } from "../../crypto/e2ee";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { InvitePreview, MyGroupJoinRequest } from "../../types";

type Props = NativeStackScreenProps<RootStackParamList, "JoinGroup">;

export function JoinGroupScreen({ navigation }: Props) {
  const joinConversationByInvite = useChatStore((s) => s.joinConversationByInvite);

  const [invite, setInvite] = useState("");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [myRequests, setMyRequests] = useState<MyGroupJoinRequest[]>([]);

  const loadMyRequests = useCallback(() => {
    chatsApi
      .listMyJoinRequests()
      .then(setMyRequests)
      .catch(() => {});
  }, []);

  useFocusEffect(loadMyRequests);

  const onCancelRequest = (requestId: string) => {
    setMyRequests((prev) => prev.filter((r) => r.id !== requestId));
    chatsApi.cancelMyJoinRequest(requestId).catch(() => {
      loadMyRequests();
    });
  };

  const onCheck = async () => {
    const decoded = decodeInviteLink(invite);
    if (!decoded) {
      Alert.alert("Xatolik", "Taklif havolasi noto'g'ri formatda");
      return;
    }
    setLoading(true);
    setPreview(null);
    try {
      const result = await chatsApi.getInvitePreview(decoded.code);
      setPreview(result);
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Havola topilmadi yoki eskirgan");
    } finally {
      setLoading(false);
    }
  };

  const onJoin = async () => {
    setJoining(true);
    try {
      const result = await joinConversationByInvite(invite);
      if ("pending" in result) {
        Alert.alert("So'rov yuborildi", "Guruhga qo'shilish so'rovingiz adminga yuborildi. Tasdiqlanganda xabar olasiz.");
        setInvite("");
        setPreview(null);
        loadMyRequests();
        return;
      }
      navigation.replace("ChatRoom", { conversationId: result.id, title: result.title ?? "" });
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Guruhga qo'shilib bo'lmadi");
    } finally {
      setJoining(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Taklif havolasini joylashtiring</Text>
      <TextInput
        style={styles.input}
        value={invite}
        onChangeText={(text) => {
          setInvite(text);
          setPreview(null);
        }}
        placeholder="Masalan: AbCdEfGh.k1l2m3..."
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
      />

      <TouchableOpacity
        style={[styles.button, (!invite.trim() || loading) && styles.buttonDisabled]}
        onPress={onCheck}
        disabled={!invite.trim() || loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Tekshirish</Text>}
      </TouchableOpacity>

      {preview && (
        <View style={styles.previewCard}>
          <Avatar uri={preview.avatarUrl} name={preview.title ?? "Guruh"} size={64} />
          <Text style={styles.previewTitle}>{preview.title}</Text>
          {preview.description ? <Text style={styles.previewDescription}>{preview.description}</Text> : null}
          <Text style={styles.previewMembers}>{preview.memberCount} a'zo</Text>
          <TouchableOpacity style={styles.button} onPress={onJoin} disabled={joining}>
            {joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guruhga qo'shilish</Text>}
          </TouchableOpacity>
        </View>
      )}

      {myRequests.length > 0 && (
        <View style={styles.requestsSection}>
          <Text style={styles.requestsTitle}>Yuborilgan so'rovlar</Text>
          {myRequests.map((req) => (
            <View key={req.id} style={styles.requestRow}>
              <Avatar uri={req.conversation.avatarUrl} name={req.conversation.title ?? "Guruh"} size={44} />
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{req.conversation.title}</Text>
                <Text style={styles.requestStatus}>Tasdiqlash kutilmoqda</Text>
              </View>
              <TouchableOpacity style={styles.cancelButton} onPress={() => onCancelRequest(req.id)}>
                <Text style={styles.cancelButtonText}>Bekor qilish</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16 },
  label: { fontSize: 14, color: colors.textSecondary, marginBottom: 8 },
  input: {
    minHeight: 44,
    maxHeight: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: colors.primary,
    marginTop: 16,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  previewCard: {
    marginTop: 24,
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.background,
    gap: 6,
  },
  previewTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginTop: 8 },
  previewDescription: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
  previewMembers: { fontSize: 13, color: colors.textSecondary, marginBottom: 8 },
  requestsSection: { marginTop: 32 },
  requestsTitle: { fontSize: 14, fontWeight: "600", color: colors.textSecondary, marginBottom: 12 },
  requestRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 15, fontWeight: "600", color: colors.text },
  requestStatus: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cancelButton: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelButtonText: { color: colors.textSecondary, fontSize: 12, fontWeight: "600" },
});
