import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Share,
  Switch,
  Modal,
  Pressable,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { Linkify } from "../../components/Linkify";
import { colors } from "../../theme/colors";
import { uploadPlainFile } from "../../utils/mediaFile";
import { chatsApi } from "../../api/chats";
import { exportConversation } from "../../utils/chatExport";
import { encodeInviteLink, decryptMessage } from "../../crypto/e2ee";
import { DISAPPEARING_MESSAGE_OPTIONS, formatDisappearingDuration } from "../../utils/disappearingMessages";
import { SLOW_MODE_OPTIONS, formatSlowModeDuration } from "../../utils/slowMode";
import { INVITE_EXPIRY_OPTIONS, INVITE_MAX_USES_OPTIONS, formatInviteStatus } from "../../utils/inviteLink";
import { isParticipantRestricted } from "../../utils/restriction";
import { formatJoinDate, formatTime } from "../../utils/conversation";
import { showChatNotificationSettings } from "../../utils/chatNotificationSettings";
import { ConversationParticipant, Message, MessageType, ParticipantRole } from "../../types";
import { tr } from "../../i18n";

type Props = NativeStackScreenProps<RootStackParamList, "GroupInfo">;

const ROLE_LABELS: Record<ParticipantRole, string> = {
  OWNER: "Egasi",
  ADMIN: "Admin",
  MEMBER: "A'zo",
};

// JS Date#getDay(): 0=Yakshanba..6=Shanba. Reordered to start the week on Monday.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABELS = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];

const MEDIA_LABELS: Partial<Record<MessageType, string>> = {
  IMAGE: "🖼 Rasm",
  VIDEO: "🎬 Video",
  AUDIO: "🎵 Ovozli xabar",
  FILE: "📄 Fayl",
  CONTACT: "👤 Kontakt",
  POLL: "📊 So'rovnoma",
};

export function GroupInfoScreen({ route, navigation }: Props) {
  const { conversationId } = route.params;
  const user = useAuthStore((s) => s.user);
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === conversationId));
  const contactAliases = useChatStore((s) => s.contactAliases);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const updateGroupInfo = useChatStore((s) => s.updateGroupInfo);
  const removeParticipant = useChatStore((s) => s.removeParticipant);
  const banParticipant = useChatStore((s) => s.banParticipant);
  const updateParticipantRole = useChatStore((s) => s.updateParticipantRole);
  const restrictParticipant = useChatStore((s) => s.restrictParticipant);
  const updateParticipantCustomTitle = useChatStore((s) => s.updateParticipantCustomTitle);
  const leaveGroup = useChatStore((s) => s.leaveGroup);
  const clearHistory = useChatStore((s) => s.clearHistory);
  const createInviteLink = useChatStore((s) => s.createInviteLink);
  const revokeInviteLink = useChatStore((s) => s.revokeInviteLink);
  const setDisappearingMessages = useChatStore((s) => s.setDisappearingMessages);
  const toggleMutedSender = useChatStore((s) => s.toggleMutedSender);
  const setNotificationPreview = useChatStore((s) => s.setNotificationPreview);
  const setReadReceiptsOverride = useChatStore((s) => s.setReadReceiptsOverride);
  const getConversationKey = useChatStore((s) => s.getConversationKey);

  const [title, setTitle] = useState(conversation?.title ?? "");
  const [description, setDescription] = useState(conversation?.description ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    media: number;
    voice: number;
    files: number;
    topSenders?: { userId: string; count: number }[];
    byWeekday?: number[];
    topReactedMessages?: { message: Message; reactionCount: number }[];
  } | null>(null);
  const [memberSearch, setMemberSearch] = useState("");

  useFocusEffect(
    useCallback(() => {
      chatsApi
        .getStats(conversationId)
        .then(setStats)
        .catch(() => {});
    }, [conversationId])
  );

  if (!conversation) return null;

  const getMessagePreview = (message: Message): string => {
    if (message.deletedAt) return "🚫 Xabar o'chirildi";
    if (message.type !== "TEXT") return MEDIA_LABELS[message.type] ?? "Xabar";
    try {
      const key = getConversationKey(conversation);
      return decryptMessage(message.ciphertext, message.nonce, key);
    } catch {
      return "🔒 Xabarni ochib bo'lmadi";
    }
  };

  const me = conversation.participants.find((p) => p.userId === user?.id);
  const isOwner = me?.role === "OWNER";
  const canManage = isOwner || me?.role === "ADMIN";
  const canEditInfo = canManage || conversation.membersCanChangeInfo;

  const memberQuery = memberSearch.trim().toLowerCase();
  const filteredParticipants = memberQuery
    ? conversation.participants.filter((p) => {
        const name = (contactAliases[p.userId] ?? p.user.displayName).toLowerCase();
        return name.includes(memberQuery) || p.user.username.toLowerCase().includes(memberQuery);
      })
    : conversation.participants;

  const onSaveTitle = async () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === conversation.title) {
      setTitle(conversation.title ?? "");
      return;
    }
    try {
      await updateGroupInfo(conversationId, { title: trimmed });
    } catch (err: any) {
      Alert.alert(tr("Xatolik"), err?.response?.data?.error?.message ?? "Saqlab bo'lmadi");
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
      Alert.alert(tr("Xatolik"), err?.response?.data?.error?.message ?? "Saqlab bo'lmadi");
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
      Alert.alert(tr("Xatolik"), tr("Taklif havolasini ulashib bo'lmadi"));
    } finally {
      setInviteLoading(false);
    }
  };

  const onRevokeInviteLink = () => {
    Alert.alert(tr("Taklif havolasini bekor qilish"), tr("Eski havola endi ishlamaydi. Davom etilsinmi?"), [
      { text: tr("Yo'q"), style: "cancel" },
      { text: tr("Ha, bekor qilish"), style: "destructive", onPress: () => revokeInviteLink(conversationId).catch(() => {}) },
    ]);
  };

  const onCreateInviteLinkWithOptions = async (expiresInSeconds: number | null, maxUses: number | null) => {
    if (inviteLoading) return;
    setInviteLoading(true);
    try {
      const invite = await createInviteLink(conversationId, { expiresInSeconds, maxUses });
      await Share.share({ message: invite });
    } catch {
      Alert.alert(tr("Xatolik"), tr("Taklif havolasini yaratib bo'lmadi"));
    } finally {
      setInviteLoading(false);
    }
  };

  const onConfigureInviteLink = () => {
    if (inviteLoading) return;
    Alert.alert(tr("Havolaning amal qilish muddati"), tr("Yangi taklif havolasi qachongacha amal qiladi?"), [
      ...INVITE_EXPIRY_OPTIONS.map((expiryOption) => ({
        text: expiryOption.label,
        onPress: () =>
          Alert.alert(tr("Foydalanish chegarasi"), tr("Yangi havoladan necha kishi qo'shilishi mumkin?"), [
            ...INVITE_MAX_USES_OPTIONS.map((usesOption) => ({
              text: usesOption.label,
              onPress: () => onCreateInviteLinkWithOptions(expiryOption.value, usesOption.value),
            })),
            { text: tr("Bekor qilish"), style: "cancel" as const },
          ]),
      })),
      { text: tr("Bekor qilish"), style: "cancel" as const },
    ]);
  };

  const onSetDisappearingMessages = () => {
    Alert.alert(tr("O'chiriladigan xabarlar"), tr("Yangi xabarlar belgilangan vaqtdan so'ng avtomatik o'chiriladi"),
      [
        ...DISAPPEARING_MESSAGE_OPTIONS.map((option) => ({
          text: option.label,
          onPress: () =>
            setDisappearingMessages(conversationId, option.value).catch(() => {
              Alert.alert(tr("Xatolik"), tr("Sozlamani o'zgartirib bo'lmadi"));
            }),
        })),
        { text: tr("Bekor qilish"), style: "cancel" as const },
      ]
    );
  };

  const onToggleOnlyAdminsCanSend = async (value: boolean) => {
    try {
      await updateGroupInfo(conversationId, { onlyAdminsCanSend: value });
    } catch {
      Alert.alert(tr("Xatolik"), tr("Sozlamani o'zgartirib bo'lmadi"));
    }
  };

  const onToggleNoForwards = async (value: boolean) => {
    try {
      await updateGroupInfo(conversationId, { noForwards: value });
    } catch {
      Alert.alert(tr("Xatolik"), tr("Sozlamani o'zgartirib bo'lmadi"));
    }
  };

  const onToggleRequireAdminApproval = async (value: boolean) => {
    try {
      await updateGroupInfo(conversationId, { requireAdminApproval: value });
    } catch {
      Alert.alert(tr("Xatolik"), tr("Sozlamani o'zgartirib bo'lmadi"));
    }
  };

  const onToggleMembersCanAddMembers = async (value: boolean) => {
    try {
      await updateGroupInfo(conversationId, { membersCanAddMembers: value });
    } catch {
      Alert.alert(tr("Xatolik"), tr("Sozlamani o'zgartirib bo'lmadi"));
    }
  };

  const onToggleMembersCanPinMessages = async (value: boolean) => {
    try {
      await updateGroupInfo(conversationId, { membersCanPinMessages: value });
    } catch {
      Alert.alert(tr("Xatolik"), tr("Sozlamani o'zgartirib bo'lmadi"));
    }
  };

  const onToggleMembersCanChangeInfo = async (value: boolean) => {
    try {
      await updateGroupInfo(conversationId, { membersCanChangeInfo: value });
    } catch {
      Alert.alert(tr("Xatolik"), tr("Sozlamani o'zgartirib bo'lmadi"));
    }
  };

  const onToggleHideHistoryForNewMembers = async (value: boolean) => {
    try {
      await updateGroupInfo(conversationId, { hideHistoryForNewMembers: value });
    } catch {
      Alert.alert(tr("Xatolik"), tr("Sozlamani o'zgartirib bo'lmadi"));
    }
  };

  const onToggleHideMembersList = async (value: boolean) => {
    try {
      await updateGroupInfo(conversationId, { hideMembersList: value });
    } catch {
      Alert.alert(tr("Xatolik"), tr("Sozlamani o'zgartirib bo'lmadi"));
    }
  };

  const onToggleMembersCanSendMedia = async (value: boolean) => {
    try {
      await updateGroupInfo(conversationId, { membersCanSendMedia: value });
    } catch {
      Alert.alert(tr("Xatolik"), tr("Sozlamani o'zgartirib bo'lmadi"));
    }
  };

  const onToggleMembersCanSendPolls = async (value: boolean) => {
    try {
      await updateGroupInfo(conversationId, { membersCanSendPolls: value });
    } catch {
      Alert.alert(tr("Xatolik"), tr("Sozlamani o'zgartirib bo'lmadi"));
    }
  };

  const onToggleReactionsEnabled = async (value: boolean) => {
    try {
      await updateGroupInfo(conversationId, { reactionsEnabled: value });
    } catch {
      Alert.alert(tr("Xatolik"), tr("Sozlamani o'zgartirib bo'lmadi"));
    }
  };

  const onSetWelcomeMessage = () => {
    Alert.prompt(
      "Salomlashuv xabari",
      "Yangi a'zo guruhga qo'shilganda unga avtomatik yuboriladigan xabar. Bo'sh qoldirsangiz, o'chiriladi.",
      (text) => {
        const trimmed = (text ?? "").trim();
        updateGroupInfo(conversationId, { welcomeMessage: trimmed || null }).catch(() => {
          Alert.alert(tr("Xatolik"), tr("Sozlamani o'zgartirib bo'lmadi"));
        });
      },
      "plain-text",
      conversation.welcomeMessage ?? ""
    );
  };

  const onSetSlowMode = () => {
    Alert.alert(tr("Sekin rejim"), tr("A'zolar ketma-ket xabar yuborishdan oldin kutishi kerak bo'lgan vaqt"),
      [
        ...SLOW_MODE_OPTIONS.map((option) => ({
          text: option.label,
          onPress: () =>
            updateGroupInfo(conversationId, { slowModeSeconds: option.value }).catch(() => {
              Alert.alert(tr("Xatolik"), tr("Sozlamani o'zgartirib bo'lmadi"));
            }),
        })),
        { text: tr("Bekor qilish"), style: "cancel" as const },
      ]
    );
  };

  const onPressAvatar = () => {
    if (canEditInfo) {
      onChangeAvatar();
    } else if (conversation.avatarUrl) {
      setAvatarViewerOpen(true);
    }
  };

  const onChangeAvatar = async () => {
    if (!canEditInfo || uploadingAvatar) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(tr("Ruxsat kerak"), tr("Avatar tanlash uchun galereyaga ruxsat bering"));
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
      Alert.alert(tr("Xatolik"), tr("Avatarni yangilab bo'lmadi"));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onMemberPress = (participant: ConversationParticipant) => {
    if (participant.userId === user?.id) return;

    const isSenderMuted = conversation.mutedSenderIds.includes(participant.userId);
    const muteOption = {
      text: isSenderMuted ? "🔔 Xabarlarini ovozsizlikdan chiqarish" : "🔕 Xabarlarini ovozsiz qilish",
      onPress: () =>
        toggleMutedSender(conversationId, participant.userId).catch(() => {
          Alert.alert(tr("Xatolik"), tr("Amalni bajarib bo'lmadi"));
        }),
    };

    if (!canManage) {
      Alert.alert(contactAliases[participant.userId] ?? participant.user.displayName, undefined, [
        {
          text: tr("👤 Profilni ko'rish"),
          onPress: () => navigation.navigate("UserProfile", { userId: participant.userId }),
        },
        muteOption,
        { text: tr("Bekor qilish"), style: "cancel" },
      ]);
      return;
    }

    const options: { text: string; style?: "default" | "destructive" | "cancel"; onPress?: () => void }[] = [];

    options.push({
      text: tr("👤 Profilni ko'rish"),
      onPress: () => navigation.navigate("UserProfile", { userId: participant.userId }),
    });

    options.push(muteOption);

    if (isOwner) {
      if (participant.role === "MEMBER") {
        options.push({
          text: tr("Admin qilish"),
          onPress: () => updateParticipantRole(conversationId, participant.userId, "ADMIN").catch(() => {
            Alert.alert(tr("Xatolik"), tr("Amalni bajarib bo'lmadi"));
          }),
        });
      }
      if (participant.role === "ADMIN") {
        options.push({
          text: tr("Adminlikdan olish"),
          onPress: () => updateParticipantRole(conversationId, participant.userId, "MEMBER").catch(() => {
            Alert.alert(tr("Xatolik"), tr("Amalni bajarib bo'lmadi"));
          }),
        });
        options.push({
          text: participant.customTitle ? "Maxsus unvonni o'zgartirish" : "Maxsus unvon belgilash",
          onPress: () => {
            Alert.prompt(
              "Maxsus unvon",
              "Adminning ismi yonida ko'rinadigan unvon (masalan, Moderator). Bo'sh qoldirsangiz, \"Admin\" ko'rsatiladi.",
              (text) =>
                updateParticipantCustomTitle(conversationId, participant.userId, (text ?? "").trim() || null).catch(() => {
                  Alert.alert(tr("Xatolik"), tr("Amalni bajarib bo'lmadi"));
                }),
              "plain-text",
              participant.customTitle ?? ""
            );
          },
        });
      }
      options.push({
        text: tr("Egalikni topshirish"),
        onPress: () => {
          const participantName = contactAliases[participant.userId] ?? participant.user.displayName;
          Alert.alert(tr("Egalikni topshirish"), `${participantName}ga guruh egaligini topshirasizmi?`, [
            { text: tr("Bekor qilish"), style: "cancel" },
            {
              text: tr("Topshirish"),
              onPress: () =>
                updateParticipantRole(conversationId, participant.userId, "OWNER").catch(() => {
                  Alert.alert(tr("Xatolik"), tr("Amalni bajarib bo'lmadi"));
                }),
            },
          ]);
        },
      });
    }

    if (participant.role === "MEMBER") {
      if (isParticipantRestricted(participant)) {
        options.push({
          text: tr("Cheklovni bekor qilish"),
          onPress: () =>
            restrictParticipant(conversationId, participant.userId, "off").catch(() => {
              Alert.alert(tr("Xatolik"), tr("Amalni bajarib bo'lmadi"));
            }),
        });
      } else {
        options.push({
          text: tr("Xabar yozishni cheklash"),
          onPress: () => {
            const participantName = contactAliases[participant.userId] ?? participant.user.displayName;
            Alert.alert(`${participantName}ni cheklash`, "Qancha vaqt davomida xabar yoza olmasin?", [
              {
                text: tr("1 soatga"),
                onPress: () =>
                  restrictParticipant(conversationId, participant.userId, "1h").catch(() => {
                    Alert.alert(tr("Xatolik"), tr("Amalni bajarib bo'lmadi"));
                  }),
              },
              {
                text: tr("1 kunga"),
                onPress: () =>
                  restrictParticipant(conversationId, participant.userId, "1d").catch(() => {
                    Alert.alert(tr("Xatolik"), tr("Amalni bajarib bo'lmadi"));
                  }),
              },
              {
                text: tr("1 haftaga"),
                onPress: () =>
                  restrictParticipant(conversationId, participant.userId, "1w").catch(() => {
                    Alert.alert(tr("Xatolik"), tr("Amalni bajarib bo'lmadi"));
                  }),
              },
              {
                text: tr("Doimiy"),
                onPress: () =>
                  restrictParticipant(conversationId, participant.userId, "forever").catch(() => {
                    Alert.alert(tr("Xatolik"), tr("Amalni bajarib bo'lmadi"));
                  }),
              },
              { text: tr("Bekor qilish"), style: "cancel" },
            ]);
          },
        });
      }
    }

    if (isOwner || participant.role === "MEMBER") {
      options.push({
        text: tr("Guruhdan chiqarish"),
        style: "destructive",
        onPress: () =>
          removeParticipant(conversationId, participant.userId).catch(() => {
            Alert.alert(tr("Xatolik"), tr("A'zoni chiqarib bo'lmadi"));
          }),
      });
      options.push({
        text: tr("Chiqarish va bloklash"),
        style: "destructive",
        onPress: () => {
          const participantName = contactAliases[participant.userId] ?? participant.user.displayName;
          Alert.alert(tr("Chiqarish va bloklash"),
            `${participantName} guruhdan chiqariladi va qaytadan qo'shila olmaydi. Davom etilsinmi?`,
            [
              { text: tr("Bekor qilish"), style: "cancel" },
              {
                text: tr("Bloklash"),
                style: "destructive",
                onPress: () =>
                  banParticipant(conversationId, participant.userId).catch(() => {
                    Alert.alert(tr("Xatolik"), tr("A'zoni bloklab bo'lmadi"));
                  }),
              },
            ]
          );
        },
      });
    }

    options.push({ text: tr("Bekor qilish"), style: "cancel" });

    Alert.alert(contactAliases[participant.userId] ?? participant.user.displayName, undefined, options);
  };

  const onExportChat = async () => {
    if (!user || exporting) return;
    setExporting(true);
    try {
      await exportConversation({
        conversation,
        conversationKey: getConversationKey(conversation),
        conversationTitle: conversation.title ?? "Suhbat",
        currentUserId: user.id,
        contactAliases,
      });
    } catch {
      Alert.alert(tr("Xatolik"), tr("Suhbatni eksport qilib bo'lmadi"));
    } finally {
      setExporting(false);
    }
  };

  const onClearHistory = () => {
    Alert.alert(tr("Suhbatni tozalash"), tr("Tozalangan xabarlar faqat sizning ko'rinishingizdan o'chiriladi"), [
      { text: tr("Bekor qilish"), style: "cancel" },
      { text: tr("30 kundan eski"), onPress: () => clearHistory(conversationId, 30).catch(() => {}) },
      { text: tr("90 kundan eski"), onPress: () => clearHistory(conversationId, 90).catch(() => {}) },
      { text: tr("Barchasi"), style: "destructive", onPress: () => clearHistory(conversationId).catch(() => {}) },
    ]);
  };

  const onLeave = () => {
    Alert.alert(tr("Guruhdan chiqish"), tr("Haqiqatan ham guruhdan chiqmoqchimisiz?"), [
      { text: tr("Bekor qilish"), style: "cancel" },
      {
        text: tr("Chiqish"),
        style: "destructive",
        onPress: async () => {
          try {
            await leaveGroup(conversationId);
            navigation.popToTop();
          } catch {
            Alert.alert(tr("Xatolik"), tr("Guruhdan chiqib bo'lmadi"));
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onPressAvatar} disabled={uploadingAvatar || (!canEditInfo && !conversation.avatarUrl)}>
          <Avatar uri={conversation.avatarUrl} name={conversation.title ?? "Guruh"} size={72} />
          {uploadingAvatar && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {canEditInfo ? (
            <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} onBlur={onSaveTitle} maxLength={64} />
          ) : (
            <Text style={styles.title}>{conversation.title}</Text>
          )}
          <Text style={styles.memberCount}>{conversation.participants.length} a'zo</Text>
        </View>
      </View>

      {(canEditInfo || conversation.description) && (
        <View style={styles.descriptionSection}>
          <Text style={styles.descriptionLabel}>{tr("Tavsif")}</Text>
          {canEditInfo ? (
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              onBlur={onSaveDescription}
              placeholder={tr("Guruh haqida ma'lumot qo'shing")}
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={500}
            />
          ) : (
            <Linkify text={conversation.description ?? ""} style={styles.descriptionText} />
          )}
        </View>
      )}

      <View style={styles.encryptionSection}>
        <View style={styles.encryptionHeader}>
          <View style={styles.encryptionIconBox}>
            <Text style={styles.encryptionIconText}>🔐</Text>
          </View>
          <View style={styles.encryptionHeaderInfo}>
            <Text style={styles.encryptionTitle}>{tr("End-to-end shifrlash")}</Text>
            <Text style={styles.encryptionStatus}>
              {conversation.useSenderKeys ? "SenderKey protokoli (katta guruhlar)" : "Signal Protocol"}
            </Text>
          </View>
        </View>
        <View style={styles.encryptionDetails}>
          <View style={styles.encryptionDetailRow}>
            <Text style={styles.encryptionDetailIcon}>🛡️</Text>
            <Text style={styles.encryptionDetailText}>
              {conversation.isSupergroup ? "Superguruh" : "Oddiy guruh"} — {conversation.maxMembers?.toLocaleString() ?? "200,000"} gacha a'zo
            </Text>
          </View>
          <View style={styles.encryptionDetailRow}>
            <Text style={styles.encryptionDetailIcon}>🔒</Text>
            <Text style={styles.encryptionDetailText}>{tr("Xabarlar server tomonidan o'qilmaydi")}</Text>
          </View>
          <View style={styles.encryptionDetailRow}>
            <Text style={styles.encryptionDetailIcon}>🔑</Text>
            <Text style={styles.encryptionDetailText}>
              {conversation.useSenderKeys
                ? "Har bir a'zo uchun alohida sender key"
                : "Har bir xabar uchun alohida kalit juftligi"}
            </Text>
          </View>
        </View>
        {isOwner && !conversation.isSupergroup && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => {
              Alert.alert(tr("Superguruhga aylantirish"), tr("Superguruh 500,000 gacha a'zo qo'shish imkonini beradi va SenderKey shifrlash ishlatiladi. Bu amalni bekor qilib bo'lmaydi."),
                [
                  { text: tr("Bekor qilish"), style: "cancel" },
                  {
                    text: tr("Aylantirish"),
                    onPress: () =>
                      chatsApi.upgradeToSupergroup(conversationId).catch(() => {
                        Alert.alert(tr("Xatolik"), tr("Superguruhga aylantirib bo'lmadi"));
                      }),
                  },
                ]
              );
            }}
          >
            <Text style={styles.upgradeButtonText}>{tr("Superguruhga aylantirish")}</Text>
          </TouchableOpacity>
        )}
      </View>

      {stats && (
        <View style={styles.statsSection}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>{tr("💬 Xabar")}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.media}</Text>
            <Text style={styles.statLabel}>{tr("🖼 Media")}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.voice}</Text>
            <Text style={styles.statLabel}>{tr("🎵 Ovozli")}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.files}</Text>
            <Text style={styles.statLabel}>{tr("📄 Fayl")}</Text>
          </View>
        </View>
      )}

      {stats?.topSenders && stats.topSenders.length > 0 && (
        <View style={styles.activitySection}>
          <Text style={styles.activityTitle}>{tr("Faol a'zolar")}</Text>
          {stats.topSenders.map((sender) => {
            const participant = conversation.participants.find((p) => p.userId === sender.userId);
            if (!participant) return null;
            const maxCount = stats.topSenders![0].count;
            const percent = maxCount > 0 ? (sender.count / maxCount) * 100 : 0;
            return (
              <View key={sender.userId} style={styles.activityRow}>
                <Avatar uri={participant.user.avatarUrl} name={participant.user.displayName} size={28} />
                <View style={styles.activityBarContainer}>
                  <Text style={styles.activityName} numberOfLines={1}>
                    {contactAliases[sender.userId] ?? participant.user.displayName}
                  </Text>
                  <View style={styles.activityBarTrack}>
                    <View style={[styles.activityBarFill, { width: `${percent}%` }]} />
                  </View>
                </View>
                <Text style={styles.activityCount}>{sender.count}</Text>
              </View>
            );
          })}
        </View>
      )}

      {stats?.byWeekday && (
        <View style={styles.activitySection}>
          <Text style={styles.activityTitle}>{tr("Haftalik faollik")}</Text>
          <View style={styles.weekdayRow}>
            {WEEKDAY_ORDER.map((dayIndex, i) => {
              const count = stats.byWeekday![dayIndex];
              const max = Math.max(...stats.byWeekday!, 1);
              const heightPercent = (count / max) * 100;
              return (
                <View key={i} style={styles.weekdayColumn}>
                  <View style={styles.weekdayBarTrack}>
                    <View style={[styles.weekdayBarFill, { height: `${heightPercent}%` }]} />
                  </View>
                  <Text style={styles.weekdayLabel}>{WEEKDAY_LABELS[i]}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {stats?.topReactedMessages && stats.topReactedMessages.length > 0 && (
        <View style={styles.activitySection}>
          <Text style={styles.activityTitle}>{tr("Eng ko'p reaksiya olgan xabarlar")}</Text>
          {stats.topReactedMessages.map(({ message, reactionCount }) => {
            const sender = conversation.participants.find((p) => p.userId === message.senderId);
            const senderName =
              message.senderId === user?.id
                ? "Siz"
                : contactAliases[message.senderId] ?? sender?.user.displayName ?? "";
            return (
              <TouchableOpacity
                key={message.id}
                style={styles.reactedMessageRow}
                onPress={() =>
                  navigation.navigate("ChatRoom", {
                    conversationId,
                    title: conversation.title ?? "",
                    highlightMessageId: message.id,
                  })
                }
              >
                <Avatar uri={sender?.user.avatarUrl} name={senderName} size={28} />
                <View style={styles.activityBarContainer}>
                  <Text style={styles.activityName} numberOfLines={1}>
                    {senderName}
                  </Text>
                  <Text style={styles.reactedMessagePreview} numberOfLines={1}>
                    {getMessagePreview(message)}
                  </Text>
                </View>
                <Text style={styles.reactedMessageCount}>❤️ {reactionCount}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.inviteSection}>
        <TouchableOpacity
          style={styles.inviteRow}
          onPress={() => navigation.navigate("SharedMedia", { conversationId })}
        >
          <Text style={styles.inviteIcon}>🖼</Text>
          <Text style={styles.inviteText}>{tr("Umumiy media")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.inviteRow}
          onPress={() => showChatNotificationSettings(conversation, setNotificationPreview, setReadReceiptsOverride)}
        >
          <Text style={styles.inviteIcon}>🔔</Text>
          <Text style={styles.inviteText}>{tr("Bildirishnoma sozlamalari")}</Text>
        </TouchableOpacity>
        {(conversation.type !== "GROUP" || !conversation.noForwards || canManage) && (
          <TouchableOpacity style={styles.inviteRow} onPress={onExportChat} disabled={exporting}>
            <Text style={styles.inviteIcon}>📤</Text>
            <Text style={styles.inviteText}>{tr("Suhbatni eksport qilish")}</Text>
            {exporting && <ActivityIndicator color={colors.primary} size="small" />}
          </TouchableOpacity>
        )}
      </View>

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
            <View style={styles.inviteRow}>
              <Text style={styles.inviteIcon}>ℹ️</Text>
              <Text style={styles.inviteText}>{tr("Havola holati")}</Text>
              <Text style={styles.inviteValue}>
                {formatInviteStatus(
                  conversation.inviteCodeExpiresAt,
                  conversation.inviteCodeMaxUses,
                  conversation.inviteCodeUseCount
                )}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.inviteRow} onPress={onConfigureInviteLink} disabled={inviteLoading}>
            <Text style={styles.inviteIcon}>⚙️</Text>
            <Text style={styles.inviteText}>{tr("Yangi havola yaratish (muddat/limit bilan)")}</Text>
          </TouchableOpacity>
          {conversation.inviteCode && (
            <TouchableOpacity style={styles.inviteRow} onPress={onRevokeInviteLink}>
              <Text style={styles.inviteIcon}>🚫</Text>
              <Text style={[styles.inviteText, { color: colors.danger }]}>{tr("Havolani bekor qilish")}</Text>
            </TouchableOpacity>
          )}
          <View style={styles.inviteRow}>
            <Text style={styles.inviteIcon}>🛡️</Text>
            <Text style={styles.inviteText}>{tr("Yangi a'zolarni admin tasdiqlasin")}</Text>
            <Switch value={conversation.requireAdminApproval} onValueChange={onToggleRequireAdminApproval} />
          </View>
          <TouchableOpacity
            style={styles.inviteRow}
            onPress={() => navigation.navigate("JoinRequests", { conversationId })}
          >
            <Text style={styles.inviteIcon}>📝</Text>
            <Text style={styles.inviteText}>{tr("Qo'shilish so'rovlari")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inviteRow} onPress={onSetDisappearingMessages}>
            <Text style={styles.inviteIcon}>⏳</Text>
            <Text style={styles.inviteText}>{tr("O'chiriladigan xabarlar")}</Text>
            <Text style={styles.inviteValue}>{formatDisappearingDuration(conversation.disappearingSeconds)}</Text>
          </TouchableOpacity>
          <View style={styles.inviteRow}>
            <Text style={styles.inviteIcon}>🔇</Text>
            <Text style={styles.inviteText}>{tr("Faqat adminlar yoza oladi")}</Text>
            <Switch value={conversation.onlyAdminsCanSend} onValueChange={onToggleOnlyAdminsCanSend} />
          </View>
          <TouchableOpacity style={styles.inviteRow} onPress={onSetSlowMode}>
            <Text style={styles.inviteIcon}>🐢</Text>
            <Text style={styles.inviteText}>{tr("Sekin rejim")}</Text>
            <Text style={styles.inviteValue}>{formatSlowModeDuration(conversation.slowModeSeconds)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.inviteRow} onPress={onSetWelcomeMessage}>
            <Text style={styles.inviteIcon}>👋</Text>
            <Text style={styles.inviteText}>{tr("Salomlashuv xabari")}</Text>
            <Text style={[styles.inviteValue, { maxWidth: 140 }]} numberOfLines={1}>
              {conversation.welcomeMessage || "O'rnatilmagan"}
            </Text>
          </TouchableOpacity>
          <View style={styles.inviteRow}>
            <Text style={styles.inviteIcon}>🔒</Text>
            <Text style={styles.inviteText}>{tr("A'zolarga nusxalash va yo'naltirishni man qilish")}</Text>
            <Switch value={conversation.noForwards} onValueChange={onToggleNoForwards} />
          </View>
          <View style={styles.inviteRow}>
            <Text style={styles.inviteIcon}>➕</Text>
            <Text style={styles.inviteText}>{tr("A'zolar yangi a'zo qo'shishi mumkin")}</Text>
            <Switch value={conversation.membersCanAddMembers} onValueChange={onToggleMembersCanAddMembers} />
          </View>
          <View style={styles.inviteRow}>
            <Text style={styles.inviteIcon}>📌</Text>
            <Text style={styles.inviteText}>{tr("A'zolar xabarlarni qadashi mumkin")}</Text>
            <Switch value={conversation.membersCanPinMessages} onValueChange={onToggleMembersCanPinMessages} />
          </View>
          <View style={styles.inviteRow}>
            <Text style={styles.inviteIcon}>✏️</Text>
            <Text style={styles.inviteText}>{tr("A'zolar guruh ma'lumotlarini tahrirlashi mumkin")}</Text>
            <Switch value={conversation.membersCanChangeInfo} onValueChange={onToggleMembersCanChangeInfo} />
          </View>
          <View style={styles.inviteRow}>
            <Text style={styles.inviteIcon}>🖼️</Text>
            <Text style={styles.inviteText}>{tr("A'zolar media yuborishi mumkin")}</Text>
            <Switch value={conversation.membersCanSendMedia} onValueChange={onToggleMembersCanSendMedia} />
          </View>
          <View style={styles.inviteRow}>
            <Text style={styles.inviteIcon}>📊</Text>
            <Text style={styles.inviteText}>{tr("A'zolar so'rovnoma yaratishi mumkin")}</Text>
            <Switch value={conversation.membersCanSendPolls} onValueChange={onToggleMembersCanSendPolls} />
          </View>
          <View style={styles.inviteRow}>
            <Text style={styles.inviteIcon}>🙈</Text>
            <Text style={styles.inviteText}>{tr("Yangi a'zolar uchun eski xabarlarni yashirish")}</Text>
            <Switch value={conversation.hideHistoryForNewMembers} onValueChange={onToggleHideHistoryForNewMembers} />
          </View>
          <View style={styles.inviteRow}>
            <Text style={styles.inviteIcon}>👁️</Text>
            <Text style={styles.inviteText}>{tr("A'zolardan a'zolar ro'yxatini yashirish")}</Text>
            <Switch value={conversation.hideMembersList} onValueChange={onToggleHideMembersList} />
          </View>
          <View style={styles.inviteRow}>
            <Text style={styles.inviteIcon}>😀</Text>
            <Text style={styles.inviteText}>{tr("Reaksiyalarga ruxsat berish")}</Text>
            <Switch value={conversation.reactionsEnabled} onValueChange={onToggleReactionsEnabled} />
          </View>
          <TouchableOpacity
            style={styles.inviteRow}
            onPress={() => navigation.navigate("GroupAuditLog", { conversationId })}
          >
            <Text style={styles.inviteIcon}>📋</Text>
            <Text style={styles.inviteText}>{tr("So'nggi harakatlar")}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.inviteRow}
            onPress={() => navigation.navigate("BannedUsers", { conversationId })}
          >
            <Text style={styles.inviteIcon}>🚫</Text>
            <Text style={styles.inviteText}>{tr("Bloklangan foydalanuvchilar")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {conversation.hideMembersList && !canManage ? (
        <View style={styles.hiddenMembers}>
          <Text style={styles.hiddenMembersText}>{tr("A'zolar ro'yxati guruh egasi yoki adminlar tomonidan yashirilgan")}</Text>
          <Text style={styles.hiddenMembersCount}>{conversation.participants.length} a'zo</Text>
        </View>
      ) : (
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={filteredParticipants}
          keyExtractor={(item) => item.userId}
          ItemSeparatorComponent={Separator}
          ListHeaderComponent={
            <>
              {canManage || conversation.membersCanAddMembers ? (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => navigation.navigate("AddGroupMember", { conversationId })}
                >
                  <Text style={styles.addButtonText}>+ A'zo qo'shish</Text>
                </TouchableOpacity>
              ) : null}
              {conversation.participants.length > 6 && (
                <View style={styles.memberSearchBar}>
                  <Text style={styles.memberSearchIcon}>🔍</Text>
                  <TextInput
                    style={styles.memberSearchInput}
                    placeholder={tr("A'zoni qidirish")}
                    returnKeyType="search"
                    placeholderTextColor={colors.textSecondary}
                    value={memberSearch}
                    onChangeText={setMemberSearch}
                  />
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            memberQuery ? (
              <View style={styles.memberEmpty}>
                <Text style={styles.memberEmptyText}>{tr("Hech kim topilmadi")}</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const isOnline = onlineUsers.has(item.userId);
            return (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={item.userId !== user?.id ? 0.6 : 1}
                onPress={() => onMemberPress(item)}
              >
                <Avatar uri={item.user.avatarUrl} name={item.user.displayName} online={isOnline} />
                <View style={styles.nameContainer}>
                  <Text style={styles.name}>
                    {contactAliases[item.userId] ?? item.user.displayName}
                    {item.userId === user?.id ? " (Siz)" : ""}
                  </Text>
                  <Text style={styles.joinedDate}>
                    {isOnline ? "Onlayn" : item.user.lastSeenAt ? `Oxirgi marta: ${formatTime(item.user.lastSeenAt)}` : `Qo'shilgan: ${formatJoinDate(item.joinedAt)}`}
                  </Text>
                </View>
                {item.role !== "MEMBER" && <Text style={styles.roleBadge}>{item.customTitle || ROLE_LABELS[item.role]}</Text>}
                {isParticipantRestricted(item) && <Text style={styles.restrictedBadge}>🔇</Text>}
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity style={styles.clearButton} onPress={onClearHistory}>
        <Text style={styles.clearButtonText}>{tr("🗑 Suhbatni tozalash")}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.leaveButton} onPress={onLeave}>
        <Text style={styles.leaveButtonText}>{tr("Guruhdan chiqish")}</Text>
      </TouchableOpacity>

      <Modal visible={avatarViewerOpen} transparent animationType="fade" onRequestClose={() => setAvatarViewerOpen(false)}>
        <Pressable style={styles.viewerOverlay} onPress={() => setAvatarViewerOpen(false)}>
          {conversation.avatarUrl && <Image source={{ uri: conversation.avatarUrl }} style={styles.viewerImage} resizeMode="contain" />}
        </Pressable>
      </Modal>
    </View>
  );
}

const Separator = () => <View style={styles.separator} />;

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
  encryptionSection: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    padding: 16,
  },
  encryptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  encryptionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  encryptionIconText: { fontSize: 22 },
  encryptionHeaderInfo: { flex: 1 },
  encryptionTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  encryptionStatus: { fontSize: 13, color: colors.primary, marginTop: 2, fontWeight: "500" },
  encryptionDetails: {
    backgroundColor: colors.primary + "08",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  encryptionDetailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  encryptionDetailIcon: { fontSize: 16, width: 24 },
  encryptionDetailText: { fontSize: 13, color: colors.text, flex: 1, lineHeight: 18 },
  upgradeButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignSelf: "center",
  },
  upgradeButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  statsSection: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 17, fontWeight: "700", color: colors.text },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  activitySection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  activityTitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 10, fontWeight: "600" },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  activityBarContainer: { flex: 1 },
  activityName: { fontSize: 13, color: colors.text, marginBottom: 4 },
  activityBarTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" },
  activityBarFill: { height: "100%", borderRadius: 3, backgroundColor: colors.primary },
  activityCount: { fontSize: 13, color: colors.textSecondary, minWidth: 28, textAlign: "right" },
  weekdayRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", height: 90 },
  weekdayColumn: { flex: 1, alignItems: "center", gap: 6 },
  weekdayBarTrack: {
    width: 16,
    height: 60,
    borderRadius: 4,
    backgroundColor: colors.border,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  weekdayBarFill: { width: "100%", borderRadius: 4, backgroundColor: colors.primary, minHeight: 2 },
  weekdayLabel: { fontSize: 11, color: colors.textSecondary },
  reactedMessageRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  reactedMessagePreview: { fontSize: 12, color: colors.textSecondary },
  reactedMessageCount: { fontSize: 13, color: colors.textSecondary, marginLeft: 8 },
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
  memberSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 38,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  memberSearchIcon: { fontSize: 14 },
  memberSearchInput: { flex: 1, fontSize: 15, color: colors.text, height: "100%", padding: 0 },
  memberEmpty: { padding: 24, alignItems: "center" },
  memberEmptyText: { color: colors.textSecondary, fontSize: 14 },
  hiddenMembers: { padding: 24, alignItems: "center", gap: 4 },
  hiddenMembersText: { color: colors.textSecondary, fontSize: 14, textAlign: "center" },
  hiddenMembersCount: { color: colors.text, fontSize: 15, fontWeight: "600", marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  nameContainer: { flex: 1 },
  name: { fontSize: 16, color: colors.text },
  joinedDate: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  roleBadge: { fontSize: 12, color: colors.primary, fontWeight: "600" },
  restrictedBadge: { fontSize: 14, marginLeft: 8 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  clearButton: { paddingVertical: 16, alignItems: "center" },
  clearButtonText: { color: colors.text, fontSize: 16, fontWeight: "600" },
  leaveButton: { paddingVertical: 16, alignItems: "center" },
  leaveButtonText: { color: colors.danger, fontSize: 16, fontWeight: "600" },
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
