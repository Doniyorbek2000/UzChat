import { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { chatsApi } from "../../api/chats";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { GroupAuditLogEntry } from "../../types";
import { formatTime } from "../../utils/conversation";

type Props = NativeStackScreenProps<RootStackParamList, "GroupAuditLog">;

const PAGE_SIZE = 50;

const ACTION_ICONS: Record<GroupAuditLogEntry["action"], string> = {
  MEMBER_REMOVED: "🚫",
  ROLE_CHANGED: "👑",
  MEMBER_RESTRICTED: "🔇",
  MEMBER_UNRESTRICTED: "🔊",
  MESSAGE_DELETED: "🗑️",
  MEMBER_BANNED: "⛔",
  MEMBER_UNBANNED: "✅",
  MEMBER_ADDED: "➕",
  MESSAGE_PINNED: "📌",
  MESSAGE_UNPINNED: "📍",
  ALL_MESSAGES_UNPINNED: "🧹",
  GROUP_SETTINGS_CHANGED: "⚙️",
  MEMBER_LEFT: "🚪",
};

const SETTINGS_FIELD_LABELS: Record<string, string> = {
  onlyAdminsCanSend: "faqat adminlar yozishi",
  slowModeSeconds: "sekin rejim",
  noForwards: "nusxalash/yo'naltirishni man qilish",
  requireAdminApproval: "qo'shilish so'rovlari",
  membersCanAddMembers: "a'zo qo'shish huquqi",
  membersCanPinMessages: "xabar qadash huquqi",
  membersCanChangeInfo: "ma'lumot tahrirlash huquqi",
  membersCanSendMedia: "media yuborish huquqi",
  membersCanSendPolls: "so'rovnoma yaratish huquqi",
  hideHistoryForNewMembers: "eski xabarlar tarixini yashirish",
  hideMembersList: "a'zolar ro'yxatini yashirish",
  reactionsEnabled: "reaksiyalar",
  disappearingSeconds: "o'chiriladigan xabarlar taymeri",
};

const RESTRICTION_LABELS: Record<string, string> = {
  "1h": "1 soatga",
  "1d": "1 kunga",
  "1w": "1 haftaga",
  forever: "doimiy",
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "guruh egasi",
  ADMIN: "admin",
};

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  TEXT: "matnli xabar",
  IMAGE: "rasm",
  VIDEO: "video",
  AUDIO: "ovozli xabar",
  FILE: "fayl",
  CONTACT: "kontakt",
  POLL: "so'rovnoma",
};

function describeEntry(entry: GroupAuditLogEntry): string {
  const actor = entry.actor?.displayName ?? "Kimdir";
  const target = entry.target?.displayName ?? "foydalanuvchi";
  switch (entry.action) {
    case "MEMBER_REMOVED":
      return `${actor} ${target}ni guruhdan chiqardi`;
    case "ROLE_CHANGED":
      if (entry.details === "MEMBER") return `${actor} ${target}ni adminlikdan tushirdi`;
      return `${actor} ${target}ni ${ROLE_LABELS[entry.details ?? ""] ?? entry.details} etib tayinladi`;
    case "MEMBER_RESTRICTED":
      return `${actor} ${target}ni ${RESTRICTION_LABELS[entry.details ?? ""] ?? ""} cheklab qo'ydi`;
    case "MEMBER_UNRESTRICTED":
      return `${actor} ${target}ning cheklovini olib tashladi`;
    case "MESSAGE_DELETED":
      return `${actor} ${target} yuborgan xabarni o'chirdi (${MESSAGE_TYPE_LABELS[entry.details ?? ""] ?? "xabar"})`;
    case "MEMBER_BANNED":
      return `${actor} ${target}ni guruhdan chiqarib, bloklab qo'ydi`;
    case "MEMBER_UNBANNED":
      return `${actor} ${target}ning blokini olib tashladi`;
    case "MEMBER_ADDED":
      return `${actor} ${target}ni guruhga qo'shdi`;
    case "MESSAGE_PINNED":
      return `${actor} ${target} yuborgan xabarni qadab qo'ydi (${MESSAGE_TYPE_LABELS[entry.details ?? ""] ?? "xabar"})`;
    case "MESSAGE_UNPINNED":
      return `${actor} ${target} yuborgan xabarni qadovdan oldi (${MESSAGE_TYPE_LABELS[entry.details ?? ""] ?? "xabar"})`;
    case "ALL_MESSAGES_UNPINNED":
      return `${actor} barcha qadalgan xabarlarni qadovdan oldi (${entry.details ?? "0"} ta)`;
    case "GROUP_SETTINGS_CHANGED": {
      const fields = (entry.details ?? "")
        .split(",")
        .filter(Boolean)
        .map((f) => SETTINGS_FIELD_LABELS[f] ?? f);
      return `${actor} guruh sozlamalarini o'zgartirdi: ${fields.join(", ")}`;
    }
    case "MEMBER_LEFT":
      return `${actor} guruhdan chiqdi`;
    default:
      return "";
  }
}

export function GroupAuditLogScreen({ route }: Props) {
  const { conversationId } = route.params;
  const [entries, setEntries] = useState<GroupAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const load = useCallback(() => {
    chatsApi
      .getAuditLog(conversationId)
      .then((data) => {
        setEntries(data);
        setHasMore(data.length === PAGE_SIZE);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [conversationId]);

  useFocusEffect(load);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await chatsApi.getAuditLog(conversationId);
      setEntries(data);
      setHasMore(data.length === PAGE_SIZE);
    } catch {}
    setRefreshing(false);
  };

  const onLoadMore = async () => {
    if (loadingMore || !hasMore || entries.length === 0) return;
    setLoadingMore(true);
    try {
      const data = await chatsApi.getAuditLog(conversationId, entries[entries.length - 1].createdAt);
      setEntries((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    } catch {}
    setLoadingMore(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={styles.footerLoader} /> : null}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={item.actor?.avatarUrl ?? null} name={item.actor?.displayName ?? "?"} size={36} />
            <View style={styles.content}>
              <Text style={styles.text}>
                {ACTION_ICONS[item.action]} {describeEntry(item)}
              </Text>
              <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Hozircha harakatlar yo'q</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "flex-start", padding: 12, gap: 12 },
  content: { flex: 1 },
  text: { fontSize: 14, color: colors.text, lineHeight: 20 },
  time: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 60 },
  footerLoader: { marginVertical: 16 },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
});
