import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Alert, Share, Modal, Pressable, Image } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { usersApi } from "../../api/users";
import { useChatStore } from "../../store/chatStore";
import { Avatar } from "../../components/Avatar";
import { Linkify } from "../../components/Linkify";
import { colors } from "../../theme/colors";
import { User } from "../../types";
import { formatTime } from "../../utils/conversation";

type Props = NativeStackScreenProps<RootStackParamList, "UserProfile">;

export function UserProfileScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const contactAliases = useChatStore((s) => s.contactAliases);
  const createDirectConversation = useChatStore((s) => s.createDirectConversation);

  useEffect(() => {
    usersApi
      .getById(userId)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
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
      </View>

      {!!profile.bio && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Bio</Text>
          <Linkify text={profile.bio} style={styles.bio} />
        </View>
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
      </View>
      <Modal visible={avatarViewerOpen} transparent animationType="fade" onRequestClose={() => setAvatarViewerOpen(false)}>
        <Pressable style={styles.viewerOverlay} onPress={() => setAvatarViewerOpen(false)}>
          {profile.avatarUrl && <Image source={{ uri: profile.avatarUrl }} style={styles.viewerImage} resizeMode="contain" />}
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
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sectionLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, fontWeight: "600" },
  bio: { fontSize: 15, color: colors.text, lineHeight: 20 },
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
});
