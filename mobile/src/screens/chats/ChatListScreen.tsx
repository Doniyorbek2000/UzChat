import { useCallback, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, ScrollView, StyleSheet, RefreshControl, Alert, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useState } from "react";
import { MainTabScreenProps } from "../../navigation/types";
import { useChatStore, DecryptedMessage } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { EmptyState } from "../../components/EmptyState";
import { colors } from "../../theme/colors";
import { ChatFolder, Conversation, ConversationParticipant } from "../../types";
import { getConversationDisplay, formatTime, isConversationUnread } from "../../utils/conversation";
import { decryptMessage } from "../../crypto/e2ee";
import { stripFormatting } from "../../utils/textFormat";

type Props = MainTabScreenProps<"Chats">;

function isMessageRead(message: { createdAt: string }, participant: ConversationParticipant): boolean {
  return !!participant.lastReadAt && new Date(participant.lastReadAt) >= new Date(message.createdAt);
}

function isMessageDelivered(message: { createdAt: string }, participant: ConversationParticipant): boolean {
  return !!participant.lastDeliveredAt && new Date(participant.lastDeliveredAt) >= new Date(message.createdAt);
}

const MEDIA_LABELS: Record<string, string> = {
  IMAGE: "🖼 Rasm",
  VIDEO: "🎬 Video",
  AUDIO: "🎵 Ovozli xabar",
  FILE: "📄 Fayl",
  CONTACT: "👤 Kontakt",
};

export function ChatListScreen({ navigation }: Props) {
  const conversations = useChatStore((s) => s.conversations);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const contactAliases = useChatStore((s) => s.contactAliases);
  const favoriteContactIds = useChatStore((s) => s.favoriteContactIds);
  const loadContactAliases = useChatStore((s) => s.loadContactAliases);
  const getConversationKey = useChatStore((s) => s.getConversationKey);
  const setupSocketListeners = useChatStore((s) => s.setupSocketListeners);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const typingUsers = useChatStore((s) => s.typingUsers);
  const recordingUsers = useChatStore((s) => s.recordingUsers);
  const togglePin = useChatStore((s) => s.togglePin);
  const reorderPinned = useChatStore((s) => s.reorderPinned);
  const muteConversation = useChatStore((s) => s.muteConversation);
  const setNotificationPreview = useChatStore((s) => s.setNotificationPreview);
  const setReadReceiptsOverride = useChatStore((s) => s.setReadReceiptsOverride);
  const toggleArchive = useChatStore((s) => s.toggleArchive);
  const toggleUnread = useChatStore((s) => s.toggleUnread);
  const markAllRead = useChatStore((s) => s.markAllRead);
  const clearHistory = useChatStore((s) => s.clearHistory);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const deleteConversationForEveryone = useChatStore((s) => s.deleteConversationForEveryone);
  const leaveGroup = useChatStore((s) => s.leaveGroup);
  const drafts = useChatStore((s) => s.drafts);
  const loadDrafts = useChatStore((s) => s.loadDrafts);
  const folders = useChatStore((s) => s.folders);
  const loadFolders = useChatStore((s) => s.loadFolders);
  const setFolderConversations = useChatStore((s) => s.setFolderConversations);
  const searchAllMessages = useChatStore((s) => s.searchAllMessages);
  const isConnected = useChatStore((s) => s.isConnected);
  const user = useAuthStore((s) => s.user);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [messageResults, setMessageResults] = useState<{ conversationId: string; message: DecryptedMessage }[]>([]);
  const [searchingMessages, setSearchingMessages] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setupSocketListeners();
    loadDrafts().catch(() => {});
  }, [setupSocketListeners, loadDrafts]);

  useFocusEffect(
    useCallback(() => {
      loadConversations().catch(() => {});
      loadContactAliases().catch(() => {});
      loadFolders().catch(() => {});
    }, [loadConversations, loadContactAliases, loadFolders])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadConversations().catch(() => {}), loadContactAliases().catch(() => {})]);
    setRefreshing(false);
  };

  useEffect(() => {
    if (activeFolderId && !folders.some((f) => f.id === activeFolderId)) {
      setActiveFolderId(null);
    }
  }, [folders, activeFolderId]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setMessageResults([]);
      setSearchingMessages(false);
      return;
    }
    setSearchingMessages(true);
    const timer = setTimeout(() => {
      searchAllMessages(q)
        .then(setMessageResults)
        .catch(() => setMessageResults([]))
        .finally(() => setSearchingMessages(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchAllMessages]);

  useEffect(() => {
    if (!selectionMode) {
      navigation.setOptions({
        title: "Suhbatlar",
        headerLeft: undefined,
        headerRight: () => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginRight: 8 }}>
            <TouchableOpacity onPress={() => navigation.navigate("Contacts")} hitSlop={8}>
              <Text style={{ fontSize: 20 }}>👥</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate("CallHistory")} hitSlop={8}>
              <Text style={{ fontSize: 20 }}>📞</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate("Stories")} hitSlop={8}>
              <Text style={{ fontSize: 20 }}>📷</Text>
            </TouchableOpacity>
          </View>
        ),
      });
      return;
    }
    navigation.setOptions({
      title: `${selectedIds.size} ta tanlandi`,
      headerLeft: () => (
        <TouchableOpacity onPress={exitSelectionMode} hitSlop={8}>
          <Text style={styles.headerActionIcon}>✕</Text>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onToggleSelectAll} hitSlop={8}>
            <Text style={styles.headerActionIcon}>☑️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBulkPin} hitSlop={8}>
            <Text style={styles.headerActionIcon}>📌</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBulkMarkRead} hitSlop={8}>
            <Text style={styles.headerActionIcon}>✅</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBulkArchive} hitSlop={8}>
            <Text style={styles.headerActionIcon}>🗄</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBulkDelete} hitSlop={8}>
            <Text style={styles.headerActionIcon}>🗑</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, selectionMode, selectedIds, conversations]);

  const renderPreview = (conversation: Conversation): string => {
    const lastMessage = conversation.lastMessage;
    if (!lastMessage) return "Xabarlar yo'q";
    if (lastMessage.type === "SYSTEM") return lastMessage.ciphertext;
    if (lastMessage.deletedAt) return "Xabar o'chirildi";
    if (lastMessage.type === "IMAGE" && lastMessage.viewOnce) {
      return lastMessage.viewedAt ? "🔥 Ko'rilgan rasm" : "🔥 Bir martalik rasm";
    }
    if (lastMessage.type in MEDIA_LABELS) return MEDIA_LABELS[lastMessage.type];
    try {
      const key = getConversationKey(conversation);
      return stripFormatting(decryptMessage(lastMessage.ciphertext, lastMessage.nonce, key));
    } catch {
      return "Xabarni ochib bo'lmadi";
    }
  };

  const onMutePress = (item: Conversation) => {
    if (item.isMuted) {
      muteConversation(item.id, "off").catch(() => {});
      return;
    }
    Alert.alert("Ovozsiz qilish muddati", undefined, [
      { text: "1 soatga", onPress: () => muteConversation(item.id, "1h").catch(() => {}) },
      { text: "2 soatga", onPress: () => muteConversation(item.id, "2h").catch(() => {}) },
      { text: "8 soatga", onPress: () => muteConversation(item.id, "8h").catch(() => {}) },
      { text: "1 kunga", onPress: () => muteConversation(item.id, "1d").catch(() => {}) },
      { text: "2 kunga", onPress: () => muteConversation(item.id, "2d").catch(() => {}) },
      { text: "1 haftaga", onPress: () => muteConversation(item.id, "1w").catch(() => {}) },
      { text: "Doimiy", onPress: () => muteConversation(item.id, "forever").catch(() => {}) },
      { text: "Bekor qilish", style: "cancel" },
    ]);
  };

  const onNotificationPreviewPress = (item: Conversation) => {
    Alert.alert("Bildirishnoma matni", "Bu suhbat uchun bildirishnomada xabar matnini ko'rsatishni boshqaring", [
      { text: "Standart", onPress: () => setNotificationPreview(item.id, "DEFAULT").catch(() => {}) },
      { text: "Har doim ko'rsatish", onPress: () => setNotificationPreview(item.id, "SHOW").catch(() => {}) },
      { text: "Har doim yashirish", onPress: () => setNotificationPreview(item.id, "HIDE").catch(() => {}) },
      { text: "Bekor qilish", style: "cancel" },
    ]);
  };

  const onReadReceiptsPress = (item: Conversation) => {
    Alert.alert("O'qildi belgisi", "Bu suhbatda o'qilgan xabar belgisini yuborishni boshqaring", [
      { text: "Standart", onPress: () => setReadReceiptsOverride(item.id, "DEFAULT").catch(() => {}) },
      { text: "Yoqish", onPress: () => setReadReceiptsOverride(item.id, "ON").catch(() => {}) },
      { text: "O'chirish", onPress: () => setReadReceiptsOverride(item.id, "OFF").catch(() => {}) },
      { text: "Bekor qilish", style: "cancel" },
    ]);
  };

  const onAddToFolderPress = (item: Conversation) => {
    if (folders.length === 0) {
      Alert.alert("Papkalar yo'q", "Avval suhbatlar papkasini yarating", [
        { text: "Bekor qilish", style: "cancel" },
        { text: "Papka yaratish", onPress: () => navigation.navigate("ChatFolders") },
      ]);
      return;
    }
    Alert.alert("Papkaga qo'shish", undefined, [
      ...folders.map((folder) => {
        const inFolder = folder.conversationIds.includes(item.id);
        return {
          text: `${inFolder ? "✓ " : ""}${folder.icon ?? "📁"} ${folder.name}`,
          onPress: () => {
            const nextIds = inFolder
              ? folder.conversationIds.filter((id) => id !== item.id)
              : [...folder.conversationIds, item.id];
            setFolderConversations(folder.id, nextIds).catch(() => {});
          },
        };
      }),
      { text: "Bekor qilish", style: "cancel" },
    ]);
  };

  const onClearHistoryPress = (item: Conversation) => {
    Alert.alert("Suhbatni tozalash", "Tozalangan xabarlar faqat sizning ko'rinishingizdan o'chiriladi", [
      { text: "Bekor qilish", style: "cancel" },
      { text: "30 kundan eski", onPress: () => clearHistory(item.id, 30).catch(() => {}) },
      { text: "90 kundan eski", onPress: () => clearHistory(item.id, 90).catch(() => {}) },
      { text: "Barchasi", style: "destructive", onPress: () => clearHistory(item.id).catch(() => {}) },
    ]);
  };

  const onDeleteForEveryonePress = (item: Conversation) => {
    Alert.alert(
      "Hammaga o'chirish",
      "Suhbat va barcha xabarlar ikki tomon uchun ham butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.",
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "Hammaga o'chirish",
          style: "destructive",
          onPress: () =>
            deleteConversationForEveryone(item.id).catch(() => Alert.alert("Xatolik", "Suhbatni o'chirib bo'lmadi")),
        },
      ]
    );
  };

  const onDeleteConversationPress = (item: Conversation) => {
    if (item.type === "DIRECT" && !item.isSelf) {
      Alert.alert("Suhbatni o'chirish", undefined, [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "Faqat men uchun",
          onPress: () =>
            deleteConversation(item.id).catch(() => Alert.alert("Xatolik", "Suhbatni o'chirib bo'lmadi")),
        },
        {
          text: "Hammaga o'chirish",
          style: "destructive",
          onPress: () => onDeleteForEveryonePress(item),
        },
      ]);
      return;
    }

    Alert.alert(
      "Suhbatni o'chirish",
      "Suhbat ro'yxatdan va tarix sizning ko'rinishingizdan o'chiriladi. Yangi xabar kelsa, suhbat qaytadan paydo bo'ladi.",
      [
        { text: "Bekor qilish", style: "cancel" },
        {
          text: "O'chirish",
          style: "destructive",
          onPress: () => deleteConversation(item.id).catch(() => Alert.alert("Xatolik", "Suhbatni o'chirib bo'lmadi")),
        },
      ]
    );
  };

  const onLeaveGroupPress = (item: Conversation) => {
    Alert.alert("Guruhdan chiqish", "Haqiqatan ham guruhdan chiqmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "Chiqish",
        style: "destructive",
        onPress: () => leaveGroup(item.id).catch(() => Alert.alert("Xatolik", "Guruhdan chiqib bo'lmadi")),
      },
    ]);
  };

  const onLongPressConversation = (item: Conversation) => {
    const pinned = conversations.filter((c) => c.isPinned);
    const pinnedIndex = pinned.findIndex((c) => c.id === item.id);
    Alert.alert(item.title ?? "Suhbat", undefined, [
      {
        text: "☑️ Tanlash",
        onPress: () => enterSelectionMode(item.id),
      },
      {
        text: isConversationUnread(item, user!.id) ? "✅ O'qilgan deb belgilash" : "🔵 O'qilmagan deb belgilash",
        onPress: () => toggleUnread(item.id).catch(() => {}),
      },
      {
        text: item.isPinned ? "📌 Qadashni bekor qilish" : "📌 Qadab qo'yish",
        onPress: () => togglePin(item.id).catch(() => {}),
      },
      ...(item.isPinned && pinnedIndex > 0
        ? [{ text: "⬆️ Yuqoriga ko'tarish", onPress: () => reorderPinned(item.id, "up").catch(() => {}) }]
        : []),
      ...(item.isPinned && pinnedIndex < pinned.length - 1
        ? [{ text: "⬇️ Pastga tushirish", onPress: () => reorderPinned(item.id, "down").catch(() => {}) }]
        : []),
      {
        text: item.isMuted ? "🔔 Ovozli qilish" : "🔕 Ovozsiz qilish",
        onPress: () => onMutePress(item),
      },
      {
        text: "✉️ Bildirishnoma matni",
        onPress: () => onNotificationPreviewPress(item),
      },
      {
        text: "👁 O'qildi belgisi",
        onPress: () => onReadReceiptsPress(item),
      },
      {
        text: "📁 Papkaga qo'shish",
        onPress: () => onAddToFolderPress(item),
      },
      {
        text: item.isArchived ? "📤 Arxivdan chiqarish" : "🗄 Arxivlash",
        onPress: () => toggleArchive(item.id).catch(() => {}),
      },
      { text: "🗑 Suhbatni tozalash", onPress: () => onClearHistoryPress(item) },
      { text: "❌ Suhbatni o'chirish", onPress: () => onDeleteConversationPress(item) },
      ...((item.type === "GROUP" || item.type === "CHANNEL") ? [{ text: item.type === "CHANNEL" ? "🚪 Kanaldan chiqish" : "🚪 Guruhdan chiqish", onPress: () => onLeaveGroupPress(item) }] : []),
      { text: "Bekor qilish", style: "cancel" },
    ]);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const enterSelectionMode = (conversationId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([conversationId]));
  };

  const toggleSelected = (conversationId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(conversationId)) next.delete(conversationId);
      else next.add(conversationId);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  };

  const onToggleSelectAll = () => {
    const ids = filteredConversations.map((c) => c.id);
    if (selectedIds.size >= ids.length) {
      exitSelectionMode();
    } else {
      setSelectedIds(new Set(ids));
    }
  };

  const onBulkPin = async () => {
    const items = conversations.filter((c) => selectedIds.has(c.id));
    if (items.length === 0) return;
    const allPinned = items.every((c) => c.isPinned);
    for (const item of items) {
      if (item.isPinned === allPinned) {
        await togglePin(item.id).catch(() => {});
      }
    }
    exitSelectionMode();
  };

  const onBulkMarkRead = async () => {
    const ids = [...selectedIds];
    await Promise.all(
      ids.map((id) => {
        const c = conversations.find((conv) => conv.id === id);
        return c && isConversationUnread(c, user!.id) ? toggleUnread(id).catch(() => {}) : Promise.resolve();
      })
    );
    exitSelectionMode();
  };

  const onBulkArchive = async () => {
    const ids = [...selectedIds];
    await Promise.all(ids.map((id) => toggleArchive(id).catch(() => {})));
    exitSelectionMode();
  };

  const onBulkDelete = () => {
    const ids = [...selectedIds];
    Alert.alert("Suhbatlarni o'chirish", `${ids.length} ta suhbat ro'yxatdan o'chiriladi`, [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: async () => {
          await Promise.all(ids.map((id) => deleteConversation(id).catch(() => {})));
          exitSelectionMode();
        },
      },
    ]);
  };

  const formatActivityLabel = (conversation: Conversation, userIds: Set<string> | undefined, suffix: string): string => {
    if (conversation.type !== "GROUP" || !userIds || userIds.size === 0) return suffix;
    const names = Array.from(userIds)
      .map((id) => contactAliases[id] ?? conversation.participants.find((p) => p.userId === id)?.user.displayName)
      .filter((name): name is string => !!name);
    if (names.length === 0) return suffix;
    if (names.length === 1) return `${names[0]} ${suffix}`;
    if (names.length === 2) return `${names[0]} va ${names[1]} ${suffix}`;
    return `${names[0]}, ${names[1]} va yana ${names.length - 2} kishi ${suffix}`;
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const display = getConversationDisplay(item, user!.id, contactAliases);
    const unread = isConversationUnread(item, user!.id);
    const isRecording = (recordingUsers[item.id]?.size ?? 0) > 0;
    const isTyping = (typingUsers[item.id]?.size ?? 0) > 0;
    const otherParticipant =
      item.type === "DIRECT" ? item.participants.find((p) => p.userId !== user!.id) : undefined;
    const isFavorite = !!otherParticipant && favoriteContactIds.has(otherParticipant.userId);
    const lastMessage = item.lastMessage;
    const showReceipt =
      !!lastMessage &&
      !!otherParticipant &&
      lastMessage.senderId === user!.id &&
      lastMessage.type !== "SYSTEM" &&
      !lastMessage.deletedAt;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => {
          if (selectionMode) {
            toggleSelected(item.id);
            return;
          }
          navigation.navigate("ChatRoom", { conversationId: item.id, title: display.title });
        }}
        onLongPress={() => {
          if (selectionMode) return;
          onLongPressConversation(item);
        }}
      >
        {selectionMode && (
          <View style={[styles.selectCheckbox, selectedIds.has(item.id) && styles.selectCheckboxSelected]}>
            {selectedIds.has(item.id) && <Text style={styles.selectCheckmark}>✓</Text>}
          </View>
        )}
        <Avatar
          uri={display.avatarUrl}
          name={display.title}
          icon={item.isSelf ? "📝" : undefined}
          online={!!display.otherUser && onlineUsers.has(display.otherUser.id)}
        />
        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.titleRow}>
              {item.isPinned && <Text style={styles.pinIcon}>📌</Text>}
              <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>
                {display.title}
              </Text>
              {isFavorite && <Text style={styles.favoriteIcon}>⭐</Text>}
            </View>
            {item.lastMessage && (
              <View style={styles.timeRow}>
                {showReceipt && (
                  <Text style={[styles.receipt, isMessageRead(item.lastMessage, otherParticipant!) && styles.receiptRead]}>
                    {isMessageRead(item.lastMessage, otherParticipant!) || isMessageDelivered(item.lastMessage, otherParticipant!)
                      ? "✓✓"
                      : "✓"}
                  </Text>
                )}
                <Text style={styles.time}>{formatTime(item.lastMessage.createdAt)}</Text>
              </View>
            )}
          </View>
          <View style={styles.bottomRow}>
            <Text style={[styles.preview, (isTyping || isRecording) && styles.previewTyping]} numberOfLines={1}>
              {isRecording ? (
                formatActivityLabel(item, recordingUsers[item.id], "🎤 ovozli xabar yozmoqda...")
              ) : isTyping ? (
                formatActivityLabel(item, typingUsers[item.id], "yozmoqda...")
              ) : drafts[item.id] ? (
                <>
                  <Text style={styles.draftLabel}>Qoralama: </Text>
                  {stripFormatting(drafts[item.id])}
                </>
              ) : (
                renderPreview(item)
              )}
            </Text>
            {item.isMuted && <Text style={styles.muteIcon}>🔕</Text>}
            {item.hasUnreadMention && (
              <View style={styles.mentionBadge}>
                <Text style={styles.mentionBadgeText}>@</Text>
              </View>
            )}
            {unread && <View style={styles.unreadDot} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessageResult = (item: { conversationId: string; message: DecryptedMessage }) => {
    const conversation = conversations.find((c) => c.id === item.conversationId);
    if (!conversation) return null;
    const display = getConversationDisplay(conversation, user!.id, contactAliases);
    const senderName =
      item.message.senderId === user?.id
        ? "Siz"
        : (contactAliases[item.message.senderId] ??
          conversation.participants.find((p) => p.userId === item.message.senderId)?.user.displayName ??
          "");

    return (
      <TouchableOpacity
        key={item.message.id}
        style={styles.row}
        onPress={() =>
          navigation.navigate("ChatRoom", {
            conversationId: conversation.id,
            title: display.title,
            highlightMessageId: item.message.id,
          })
        }
      >
        <Avatar uri={display.avatarUrl} name={display.title} icon={conversation.isSelf ? "📝" : undefined} />
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={styles.title} numberOfLines={1}>
              {display.title}
            </Text>
            <Text style={styles.time}>{formatTime(item.message.createdAt)}</Text>
          </View>
          <Text style={styles.preview} numberOfLines={1}>
            {(conversation.type === "GROUP" || conversation.type === "CHANNEL") && senderName ? `${senderName}: ` : ""}
            {item.message.text ? stripFormatting(item.message.text) : ""}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const visibleConversations = conversations.filter((c) => !c.isArchived);
  const archivedCount = conversations.length - visibleConversations.length;

  const countUnread = (convs: Conversation[]) =>
    convs.filter((c) => isConversationUnread(c, user!.id, !user!.includeMutedInBadge)).length;
  const allUnreadCount = countUnread(visibleConversations);

  const getFolderConversations = (folder: ChatFolder, convs: Conversation[]) =>
    convs.filter((c) => {
      const manuallyIncluded = folder.conversationIds.includes(c.id);
      const matchesSmartFilter =
        (folder.includeUnread && isConversationUnread(c, user!.id)) ||
        (folder.includeGroups && (c.type === "GROUP" || c.type === "CHANNEL")) ||
        (folder.includeDirect && c.type === "DIRECT");
      if (!manuallyIncluded && !matchesSmartFilter) return false;
      if (folder.excludeMuted && c.isMuted) return false;
      return true;
    });

  const activeFolder = activeFolderId ? folders.find((f) => f.id === activeFolderId) : undefined;
  const folderConversations = activeFolder ? getFolderConversations(activeFolder, visibleConversations) : visibleConversations;

  const hasUnread = folderConversations.some((c) => isConversationUnread(c, user!.id));

  const onMarkAllRead = () => {
    markAllRead(folderConversations.map((c) => c.id)).catch(() => {});
  };

  const query = searchQuery.trim().toLowerCase();
  const filteredConversations = query
    ? folderConversations.filter((c) => {
        const display = getConversationDisplay(c, user!.id, contactAliases);
        if (display.title.toLowerCase().includes(query)) return true;
        return c.participants.some(
          (p) =>
            p.user.displayName.toLowerCase().includes(query) || p.user.username.toLowerCase().includes(query)
        );
      })
    : folderConversations;

  return (
    <View style={styles.container}>
      {!isConnected && (
        <View style={styles.connectionBanner}>
          <Text style={styles.connectionBannerText}>📡 Aloqa yo'q. Qayta ulanmoqda...</Text>
        </View>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.folderBar} contentContainerStyle={styles.folderBarContent}>
        <TouchableOpacity
          style={[styles.folderChip, activeFolderId === null && styles.folderChipActive]}
          onPress={() => setActiveFolderId(null)}
        >
          <Text style={[styles.folderChipText, activeFolderId === null && styles.folderChipTextActive]}>
            Barchasi
          </Text>
          {allUnreadCount > 0 && (
            <View style={[styles.folderBadge, activeFolderId === null && styles.folderBadgeActive]}>
              <Text style={styles.folderBadgeText}>{allUnreadCount > 99 ? "99+" : allUnreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        {folders.map((folder) => {
          const folderUnreadCount = countUnread(getFolderConversations(folder, visibleConversations));
          return (
            <TouchableOpacity
              key={folder.id}
              style={[styles.folderChip, activeFolderId === folder.id && styles.folderChipActive]}
              onPress={() => setActiveFolderId(folder.id)}
            >
              <Text style={[styles.folderChipText, activeFolderId === folder.id && styles.folderChipTextActive]}>
                {folder.icon ? `${folder.icon} ${folder.name}` : folder.name}
              </Text>
              {folderUnreadCount > 0 && (
                <View style={[styles.folderBadge, activeFolderId === folder.id && styles.folderBadgeActive]}>
                  <Text style={styles.folderBadgeText}>{folderUnreadCount > 99 ? "99+" : folderUnreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={styles.folderEditChip} onPress={() => navigation.navigate("ChatFolders")}>
          <Text style={styles.folderEditIcon}>✏️</Text>
        </TouchableOpacity>
        {hasUnread && (
          <TouchableOpacity style={styles.folderEditChip} onPress={onMarkAllRead}>
            <Text style={styles.folderEditIcon}>✅</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Qidirish"
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={8}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
          keyboardShouldPersistTaps="handled"
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          !query && archivedCount > 0 ? (
            <TouchableOpacity style={styles.archiveRow} onPress={() => navigation.navigate("ArchivedChats")}>
              <Text style={styles.archiveIcon}>🗄</Text>
              <Text style={styles.archiveText}>Arxivlangan suhbatlar</Text>
              <Text style={styles.archiveCount}>{archivedCount}</Text>
            </TouchableOpacity>
          ) : null
        }
        ListFooterComponent={
          query.length >= 2 ? (
            <View>
              <Text style={styles.sectionHeader}>Xabarlar</Text>
              {searchingMessages ? (
                <ActivityIndicator color={colors.primary} style={styles.messageSearchLoader} />
              ) : messageResults.length > 0 ? (
                messageResults.map((item) => renderMessageResult(item))
              ) : (
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>Mos xabar topilmadi</Text>
                </View>
              )}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon={query ? "🔍" : "💬"}
            title={query ? "Hech narsa topilmadi" : "Hali suhbatlar yo'q"}
            subtitle={query ? undefined : "Yangi suhbat boshlash uchun + tugmasini bosing"}
          />
        }
      />
      {!selectionMode && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("NewChat")}>
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  connectionBanner: { backgroundColor: colors.danger, paddingVertical: 6, alignItems: "center" },
  connectionBannerText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  folderBar: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  folderBarContent: { paddingHorizontal: 8, paddingVertical: 8, alignItems: "center", gap: 8 },
  folderChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
  },
  folderChipActive: { backgroundColor: colors.primary },
  folderChipText: { fontSize: 14, fontWeight: "500", color: colors.textSecondary },
  folderChipTextActive: { color: "#fff" },
  folderBadge: {
    marginLeft: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  folderBadgeActive: { backgroundColor: "rgba(255,255,255,0.3)" },
  folderBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  folderEditChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.background,
  },
  folderEditIcon: { fontSize: 14 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 10,
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, height: "100%", padding: 0 },
  searchClear: { fontSize: 14, color: colors.textSecondary, paddingHorizontal: 4 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  messageSearchLoader: { marginTop: 12 },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  selectCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  selectCheckboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectCheckmark: { color: "#fff", fontSize: 13, fontWeight: "700" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  headerActionIcon: { fontSize: 20 },
  content: { flex: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 4 },
  title: { fontSize: 16, fontWeight: "600", color: colors.text, flex: 1 },
  titleUnread: { fontWeight: "700" },
  pinIcon: { fontSize: 12 },
  favoriteIcon: { fontSize: 12 },
  time: { fontSize: 12, color: colors.textSecondary, marginLeft: 8 },
  timeRow: { flexDirection: "row", alignItems: "center" },
  receipt: { fontSize: 11, color: colors.textSecondary, marginLeft: 8 },
  receiptRead: { color: colors.primary },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  preview: { fontSize: 14, color: colors.textSecondary, flex: 1 },
  previewTyping: { color: colors.primary, fontWeight: "600" },
  draftLabel: { color: colors.danger },
  muteIcon: { fontSize: 12, marginLeft: 8, color: colors.textSecondary },
  mentionBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    marginLeft: 8,
  },
  mentionBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginLeft: 8 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  archiveRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  archiveIcon: { fontSize: 20, width: 36, textAlign: "center" },
  archiveText: { flex: 1, fontSize: 15, color: colors.text },
  archiveCount: { fontSize: 13, color: colors.textSecondary },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabIcon: { color: "#fff", fontSize: 28, lineHeight: 30 },
});
