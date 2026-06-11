import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, ActivityIndicator, Share } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { uploadPlainFile } from "../../utils/mediaFile";
import { encodeInviteLink } from "../../crypto/e2ee";
import { DISAPPEARING_MESSAGE_OPTIONS, formatDisappearingDuration } from "../../utils/disappearingMessages";
import { ConversationParticipant, ParticipantRole } from "../../types";

type Props = NativeStackScreenProps<RootStackParamList, "GroupInfo">;

const ROLE_LABELS: Record<ParticipantRole, string> = {
  OWNER: "Egasi",
  ADMIN: "Admin",
  MEMBER: "A'zo",
};

export function GroupInfoScreen({ route, navigation }: Props) {
  const { conversationId } = route.params;
  const user = useAuthStore((s) => s.user);
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === conversationId));
  const updateGroupInfo = useChatStore((s) => s.updateGroupInfo);
  const removeParticipant = useChatStore((s) => s.removeParticipant);
  const updateParticipantRole = useChatStore((s) => s.updateParticipantRole);
  const leaveGroup = useChatStore((s) => s.leaveGroup);
  const clearHistory = useChatStore((s) => s.clearHistory);
  const createInviteLink = useChatStore((s) => s.createInviteLink);
  const revokeInviteLink = useChatStore((s) => s.revokeInviteLink);
  const setDisappearingMessages = useChatStore((s) => s.setDisappearingMessages);
  const getConversationKey = useChatStore((s) => s.getConversationKey);

  const [title, setTitle] = useState(conversation?.title ?? "");
  const [description, setDescription] = useState(conversation?.description ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  if (!conversation) return null;

  const me = conversation.participants.find((p) => p.userId === user?.id);
  const isOwner = me?.role === "OWNER";
  const canManage = isOwner || me?.role === "ADMIN";

  const onSaveTitle = async () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === conversation.title) {
      setTitle(conversation.title ?? "");
      return;
    }
    try {
      await updateGroupInfo(conversationId, { title: trimmed });
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Saqlab bo'lmadi");
      setTitle(conversation.title ?? "");
    }
  };

  const onSaveDescription = async () => {
    const trimmed = description.trim();
    if (trimmed === (conversation.description ?? "")) {
      setDescription(conversation.description ?? "");
      return;
    }
    try {
      await updateGroupInfo(conversationId, { description: trimmed || null });
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Saqlab bo'lmadi");
      setDescription(conversation.description ?? "");
    }
  };

  const onShareInviteLink = async () => {
    if (inviteLoading) return;
    setInviteLoading(true);
    try {
      const invite = conversation.inviteCode
        ? encodeInviteLink(conversation.inviteCode, getConversationKey(conversation))
        : await createInviteLink(conversationId);
      await Share.share({ message: invite });
    } catch {
      Alert.alert("Xatolik", "Taklif havolasini ulashib bo'lmadi");
    } finally {
      setInviteLoading(false);
    }
  };

  const onRevokeInviteLink = () => {
    Alert.alert("Taklif havolasini bekor qilish", "Eski havola endi ishlamaydi. Davom etilsinmi?", [
      { text: "Yo'q", style: "cancel" },
      { text: "Ha, bekor qilish", style: "destructive", onPress: () => revokeInviteLink(conversationId).catch(() => {}) },
    ]);
  };

  const onSetDisappearingMessages = () => {
    Alert.alert(
      "O'chiriladigan xabarlar",
      "Yangi xabarlar belgilangan vaqtdan so'ng avtomatik o'chiriladi",
      [
        ...DISAPPEARING_MESSAGE_OPTIONS.map((option) => ({
          text: option.label,
          onPress: () =>
            setDisappearingMessages(conversationId, option.value).catch(() => {
              Alert.alert("Xatolik", "Sozlamani o'zgartirib bo'lmadi");
            }),
        })),
        { text: "Bekor qilish", style: "cancel" as const },
      ]
    );
  };

  const onChangeAvatar = async () => {
    if (!canManage || uploadingAvatar) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Ruxsat kerak", "Avatar tanlash uchun galereyaga ruxsat bering");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const { url } = await uploadPlainFile(asset.uri, asset.mimeType ?? "image/jpeg");
      await updateGroupInfo(conversationId, { avatarUrl: url });
    } catch {
      Alert.alert("Xatolik", "Avatarni yangilab bo'lmadi");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onMemberPress = (participant: ConversationParticipant) => {
    if (participant.userId === user?.id || !canManage) return;

    const options: { text: string; style?: "default" | "destructive" | "cancel"; onPress?: () => void }[] = [];

    if (isOwner) {
      if (participant.role === "MEMBER") {
        options.push({
          text: "Admin qilish",
          onPress: () => updateParticipantRole(conversationId, participant.userId, "ADMIN").catch(() => {
            Alert.alert("Xatolik", "Amalni bajarib bo'lmadi");
          }),
        });
      }
      if (participant.role === "ADMIN") {
        options.push({
          text: "Adminlikdan olish",
          onPress: () => updateParticipantRole(conversationId, participant.userId, "MEMBER").catch(() => {
            Alert.alert("Xatolik", "Amalni bajarib bo'lmadi");
          }),
        });
      }
      options.push({
        text: "Egalikni topshirish",
        onPress: () => {
          Alert.alert("Egalikni topshirish", `${participant.user.displayName}ga guruh egaligini topshirasizmi?`, [
            { text: "Bekor qilish", style: "cancel" },
            {
              text: "Topshirish",
              onPress: () =>
                updateParticipantRole(conversationId, participant.userId, "OWNER").catch(() => {
                  Alert.alert("Xatolik", "Amalni bajarib bo'lmadi");
                }),
            },
          ]);
        },
      });
    }

    if (isOwner || participant.role === "MEMBER") {
      options.push({
        text: "Guruhdan chiqarish",
        style: "destructive",
        onPress: () =>
          removeParticipant(conversationId, participant.userId).catch(() => {
            Alert.alert("Xatolik", "A'zoni chiqarib bo'lmadi");
          }),
      });
    }

    options.push({ text: "Bekor qilish", style: "cancel" });

    Alert.alert(participant.user.displayName, undefined, options);
  };

  const onClearHistory = () => {
    Alert.alert(
      "Suhbatni tozalash",
      "Barcha xabarlar faqat sizning ko'rinishingizdan o'chiriladi. Davom etilsinmi?",
      [
        { text: "Bekor qilish", style: "cancel" },
        { text: "Tozalash", style: "destructive", onPress: () => clearHistory(conversationId).catch(() => {}) },
      ]
    );
  };

  const onLeave = () => {
    Alert.alert("Guruhdan chiqish", "Haqiqatan ham guruhdan chiqmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "Chiqish",
        style: "destructive",
        onPress: async () => {
          try {
            await leaveGroup(conversationId);
            navigation.popToTop();
          } catch {
            Alert.alert("Xatolik", "Guruhdan chiqib bo'lmadi");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onChangeAvatar} disabled={!canManage || uploadingAvatar}>
          <Avatar uri={conversation.avatarUrl} name={conversation.title ?? "Guruh"} size={72} />
          {uploadingAvatar && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {canManage ? (
            <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} onBlur={onSaveTitle} />
          ) : (
            <Text style={styles.title}>{conversation.title}</Text>
          )}
          <Text style={styles.memberCount}>{conversation.participants.length} a'zo</Text>
        </View>
      </View>

      {(canManage || conversation.description) && (
        <View style={styles.descriptionSection}>
          <Text style={styles.descriptionLabel}>Tavsif</Text>
          {canManage ? (
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              onBlur={onSaveDescription}
              placeholder="Guruh haqida ma'lumot qo'shing"
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={500}
            />
          ) : (
            <Text style={styles.descriptionText}>{conversation.description}</Text>
          )}
        </View>
      )}

      {canManage && (
        <View style={styles.inviteSection}>
          <TouchableOpacity style={styles.inviteRow} onPress={onShareInviteLink} disabled={inviteLoading}>
            <Text style={styles.inviteIcon}>🔗</Text>
            <Text style={styles.inviteText}>
              {conversation.inviteCode ? "Taklif havolasini ulashish" : "Taklif havolasi yaratish"}
            </Text>
            {inviteLoading && <ActivityIndicator size="small" color={colors.primary} />}
          </TouchableOpacity>
          {conversation.inviteCode && (
            <TouchableOpacity style={styles.inviteRow} onPress={onRevokeInviteLink}>
              <Text style={styles.inviteIcon}>🚫</Text>
              <Text style={[styles.inviteText, { color: colors.danger }]}>Havolani bekor qilish</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.inviteRow} onPress={onSetDisappearingMessages}>
            <Text style={styles.inviteIcon}>⏳</Text>
            <Text style={styles.inviteText}>O'chiriladigan xabarlar</Text>
            <Text style={styles.inviteValue}>{formatDisappearingDuration(conversation.disappearingSeconds)}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={conversation.participants}
        keyExtractor={(item) => item.userId}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          canManage ? (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate("AddGroupMember", { conversationId })}
            >
              <Text style={styles.addButtonText}>+ A'zo qo'shish</Text>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            activeOpacity={canManage && item.userId !== user?.id ? 0.6 : 1}
            onPress={() => onMemberPress(item)}
          >
            <Avatar uri={item.user.avatarUrl} name={item.user.displayName} />
            <Text style={styles.name}>
              {item.user.displayName}
              {item.userId === user?.id ? " (Siz)" : ""}
            </Text>
            {item.role !== "MEMBER" && <Text style={styles.roleBadge}>{ROLE_LABELS[item.role]}</Text>}
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.clearButton} onPress={onClearHistory}>
        <Text style={styles.clearButtonText}>🗑 Suhbatni tozalash</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.leaveButton} onPress={onLeave}>
        <Text style={styles.leaveButtonText}>Guruhdan chiqish</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", padding: 16, gap: 16 },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: { flex: 1 },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  titleInput: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  memberCount: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  descriptionSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  descriptionLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, fontWeight: "600" },
  descriptionText: { fontSize: 15, color: colors.text, lineHeight: 20 },
  descriptionInput: { fontSize: 15, color: colors.text, lineHeight: 20, padding: 0 },
  inviteSection: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  inviteRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  inviteIcon: { fontSize: 18 },
  inviteText: { fontSize: 15, color: colors.text, flex: 1 },
  inviteValue: { fontSize: 14, color: colors.textSecondary },
  addButton: { paddingVertical: 14, paddingHorizontal: 16 },
  addButtonText: { color: colors.primary, fontSize: 15, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  name: { fontSize: 16, color: colors.text, flex: 1 },
  roleBadge: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  clearButton: { paddingVertical: 16, alignItems: "center" },
  clearButtonText: { color: colors.text, fontSize: 16, fontWeight: "600" },
  leaveButton: { paddingVertical: 16, alignItems: "center" },
  leaveButtonText: { color: colors.danger, fontSize: 16, fontWeight: "600" },
});
