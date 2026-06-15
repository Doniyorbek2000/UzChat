import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert, Share, Modal, Pressable, Image, TextInput } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { usersApi } from "../../api/users";
import { contactsApi } from "../../api/contacts";
import { reportsApi } from "../../api/reports";
import { REPORT_REASONS } from "../../utils/reportReasons";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { Linkify } from "../../components/Linkify";
import { colors } from "../../theme/colors";
import { Contact, User } from "../../types";
import { formatTime } from "../../utils/conversation";
import { formatBirthday, isBirthdayToday } from "../../utils/birthday";

type Props = NativeStackScreenProps<RootStackParamList, "UserProfile">;

export function UserProfileScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);
  const [notifyOnlineRequested, setNotifyOnlineRequested] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [contact, setContact] = useState<Contact | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const currentUser = useAuthStore((s) => s.user);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const contactAliases = useChatStore((s) => s.contactAliases);
  const createDirectConversation = useChatStore((s) => s.createDirectConversation);

  useEffect(() => {
    usersApi
      .getById(userId)
      .then((p) => {
        setProfile(p);
        setNotifyOnlineRequested(!!p.notifyOnlineRequested);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    contactsApi
      .list()
      .then((contacts) => setContact(contacts.find((c) => c.user.id === userId) ?? null))
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (profile) navigation.setOptions({ title: contactAliases[profile.id] ?? profile.displayName });
  }, [profile, contactAliases, navigation]);

  const onMessage = async () => {
    if (!profile || opening) return;
    setOpening(true);
    try {
      const conversation = await createDirectConversation(profile);
      navigation.navigate("ChatRoom", {
        conversationId: conversation.id,
        title: contactAliases[profile.id] ?? profile.displayName,
      });
    } catch {
      Alert.alert("Xatolik", "Suhbat ochib bo'lmadi");
    } finally {
      setOpening(false);
    }
  };

  const onShare = () => {
    if (!profile) return;
    Share.share({ message: `UzChat'da menga qo'shilish uchun: @${profile.username}` }).catch(() => {});
  };

  const onOpenNoteModal = () => {
    setNoteInput(contact?.note ?? "");
    setNoteModalOpen(true);
  };

  const onSaveNote = async () => {
    if (!contact) return;
    setSavingNote(true);
    try {
      const trimmed = noteInput.trim();
      const updated = await contactsApi.updateNote(contact.id, trimmed.length > 0 ? trimmed : null);
      setContact((prev) => (prev ? { ...prev, note: updated.note } : prev));
      setNoteModalOpen(false);
    } catch {
      Alert.alert("Xatolik", "Eslatmani saqlab bo'lmadi");
    } finally {
      setSavingNote(false);
    }
  };

  const onToggleNotifyOnline = async () => {
    if (!profile || notifyLoading) return;
    setNotifyLoading(true);
    try {
      if (notifyOnlineRequested) {
        await usersApi.cancelNotifyOnline(profile.id);
        setNotifyOnlineRequested(false);
      } else {
        await usersApi.notifyOnline(profile.id);
        setNotifyOnlineRequested(true);
      }
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "Amalni bajarib bo'lmadi");
    } finally {
      setNotifyLoading(false);
    }
  };

  const onReport = () => {
    if (!profile) return;
    Alert.alert("Shikoyat sababi", "Nima uchun shikoyat qilmoqchisiz?", [
      ...REPORT_REASONS.map((option) => ({
        text: option.label,
        onPress: () => {
          reportsApi
            .create({ reportedUserId: profile.id, reason: option.value })
            .then(() => Alert.alert("Yuborildi", "Shikoyatingiz qabul qilindi"))
            .catch(() => Alert.alert("Xatolik", "Shikoyatni yuborib bo'lmadi"));
        },
      })),
      { text: "Bekor qilish", style: "cancel" as const },
    ]);
  };

  const onAddContact = async () => {
    if (!profile || sendingRequest || requestSent) return;
    setSendingRequest(true);
    try {
      await contactsApi.sendRequest(profile.username);
      setRequestSent(true);
    } catch (err: any) {
      Alert.alert("Xatolik", err?.response?.data?.error?.message ?? "So'rov yuborib bo'lmadi");
    } finally {
      setSendingRequest(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Foydalanuvchi topilmadi</Text>
      </View>
    );
  }

  const isOnline = onlineUsers.has(profile.id);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity disabled={!profile.avatarUrl} onPress={() => setAvatarViewerOpen(true)}>
          <Avatar uri={profile.avatarUrl} name={profile.displayName} size={88} online={isOnline} />
        </TouchableOpacity>
        <Text style={styles.name}>{contactAliases[profile.id] ?? profile.displayName}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        {(isOnline || profile.lastSeenAt) && (
          <Text style={styles.presence}>{isOnline ? "Onlayn" : `Oxirgi marta: ${formatTime(profile.lastSeenAt!)}`}</Text>
        )}
        {!!profile.customStatus && <Text style={styles.customStatus}>{profile.customStatus}</Text>}
      </View>

      {!!profile.bio && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Bio</Text>
          <Linkify text={profile.bio} style={styles.bio} />
        </View>
      )}

      {!!formatBirthday(profile.birthdayDay, profile.birthdayMonth) && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Tug'ilgan kun</Text>
          <Text style={styles.bio}>
            🎂 {formatBirthday(profile.birthdayDay, profile.birthdayMonth)}
            {isBirthdayToday(profile.birthdayDay, profile.birthdayMonth) && "  🎉 Bugun tug'ilgan kuni!"}
          </Text>
        </View>
      )}

      {!!contact && (
        <TouchableOpacity style={styles.section} onPress={onOpenNoteModal}>
          <Text style={styles.sectionLabel}>Shaxsiy eslatma</Text>
          {contact.note ? (
            <Text style={styles.bio}>{contact.note}</Text>
          ) : (
            <Text style={styles.notePlaceholder}>Eslatma qo'shish...</Text>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionRow} onPress={onMessage} disabled={opening}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>Xabar yozish</Text>
          {opening && <ActivityIndicator color={colors.primary} size="small" />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate("CommonGroups", { userId: profile.id })}>
          <Text style={styles.actionIcon}>👥</Text>
          <Text style={styles.actionText}>Umumiy guruhlar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate("MutualContacts", { userId: profile.id })}>
          <Text style={styles.actionIcon}>🤝</Text>
          <Text style={styles.actionText}>Umumiy kontaktlar</Text>
        </TouchableOpacity>
        {!contact && profile.id !== currentUser?.id && (
          <TouchableOpacity style={styles.actionRow} onPress={onAddContact} disabled={sendingRequest || requestSent}>
            <Text style={styles.actionIcon}>👤➕</Text>
            <Text style={styles.actionText}>{requestSent ? "So'rov yuborildi" : "Kontaktlarga qo'shish"}</Text>
            {sendingRequest && <ActivityIndicator color={colors.primary} size="small" />}
          </TouchableOpacity>
        )}
        {!isOnline && (
          <TouchableOpacity style={styles.actionRow} onPress={onToggleNotifyOnline} disabled={notifyLoading}>
            <Text style={styles.actionIcon}>{notifyOnlineRequested ? "🔕" : "🔔"}</Text>
            <Text style={styles.actionText}>
              {notifyOnlineRequested ? "Onlayn ogohlantirishni bekor qilish" : "Onlayn bo'lganda xabar bering"}
            </Text>
            {notifyLoading && <ActivityIndicator color={colors.primary} size="small" />}
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.actionRow} onPress={onShare}>
          <Text style={styles.actionIcon}>📤</Text>
          <Text style={styles.actionText}>Profilni ulashish</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionRow}
          onPress={() =>
            navigation.navigate("EncryptionKey", {
              userId: profile.id,
              displayName: contactAliases[profile.id] ?? profile.displayName,
            })
          }
        >
          <Text style={styles.actionIcon}>🔐</Text>
          <Text style={styles.actionText}>Shifrlash kaliti</Text>
        </TouchableOpacity>
        {profile.id !== currentUser?.id && (
          <TouchableOpacity style={styles.actionRow} onPress={onReport}>
            <Text style={styles.actionIcon}>🚩</Text>
            <Text style={[styles.actionText, styles.dangerText]}>Foydalanuvchini shikoyat qilish</Text>
          </TouchableOpacity>
        )}
      </View>
      <Modal visible={avatarViewerOpen} transparent animationType="fade" onRequestClose={() => setAvatarViewerOpen(false)}>
        <Pressable style={styles.viewerOverlay} onPress={() => setAvatarViewerOpen(false)}>
          {profile.avatarUrl && <Image source={{ uri: profile.avatarUrl }} style={styles.viewerImage} resizeMode="contain" />}
        </Pressable>
      </Modal>

      <Modal visible={noteModalOpen} transparent animationType="fade" onRequestClose={() => setNoteModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setNoteModalOpen(false)}>
          <Pressable style={styles.modalCard}>
            <Text style={styles.modalTitle}>Shaxsiy eslatma</Text>
            <Text style={styles.modalSubtitle}>{contactAliases[profile.id] ?? profile.displayName}</Text>
            <TextInput
              style={[styles.modalInput, styles.modalNoteInput]}
              value={noteInput}
              onChangeText={setNoteInput}
              placeholder="Faqat sizga ko'rinadigan eslatma..."
              placeholderTextColor={colors.textSecondary}
              autoFocus
              multiline
              maxLength={500}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setNoteModalOpen(false)}>
                <Text style={styles.modalCancelText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={onSaveNote} disabled={savingNote}>
                {savingNote ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveText}>Saqlash</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { paddingBottom: 24 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  emptyText: { color: colors.textSecondary },
  header: { alignItems: "center", paddingVertical: 24, gap: 6 },
  name: { fontSize: 20, fontWeight: "700", color: colors.text, marginTop: 8 },
  username: { fontSize: 14, color: colors.textSecondary },
  presence: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  customStatus: { fontSize: 14, color: colors.primary, marginTop: 4, textAlign: "center" },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sectionLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, fontWeight: "600" },
  bio: { fontSize: 15, color: colors.text, lineHeight: 20 },
  notePlaceholder: { fontSize: 15, color: colors.textSecondary, lineHeight: 20 },
  actions: { marginTop: 12 },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  actionIcon: { fontSize: 18 },
  actionText: { fontSize: 15, color: colors.text, flex: 1 },
  dangerText: { color: colors.danger },
  viewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: {
    width: "100%",
    height: "100%",
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, width: "100%" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  modalSubtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2, marginBottom: 12 },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalNoteInput: { minHeight: 96, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 16 },
  modalCancelButton: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: colors.textSecondary, fontSize: 15, fontWeight: "600" },
  modalSaveButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minWidth: 88,
    alignItems: "center",
  },
  modalSaveText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
