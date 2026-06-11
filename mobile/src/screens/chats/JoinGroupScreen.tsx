import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore } from "../../store/chatStore";
import { chatsApi } from "../../api/chats";
import { decodeInviteLink } from "../../crypto/e2ee";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { InvitePreview } from "../../types";

type Props = NativeStackScreenProps<RootStackParamList, "JoinGroup">;

export function JoinGroupScreen({ navigation }: Props) {
  const joinConversationByInvite = useChatStore((s) => s.joinConversationByInvite);

  const [invite, setInvite] = useState("");
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);

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
      const conversation = await joinConversationByInvite(invite);
      navigation.replace("ChatRoom", { conversationId: conversation.id, title: conversation.title ?? "" });
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Guruhga qo'shilib bo'lmadi");
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, padding: 16 },
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
});
