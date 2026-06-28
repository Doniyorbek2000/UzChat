import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore, DecryptedMessage } from "../../store/chatStore";
import { ErrorView } from "../../components";
import { colors } from "../../theme/colors";
import { MessageType } from "../../types";
import { formatScheduledTime, SCHEDULE_OPTIONS } from "../../utils/scheduledMessages";

type Props = NativeStackScreenProps<RootStackParamList, "ScheduledMessages">;

const MEDIA_LABELS: Partial<Record<MessageType, string>> = {
  IMAGE: "🖼 Rasm",
  VIDEO: "🎬 Video",
  AUDIO: "🎵 Ovozli xabar",
  FILE: "📄 Fayl",
  CONTACT: "👤 Kontakt",
};

function getPreview(item: DecryptedMessage): string {
  if (item.type !== "TEXT") return MEDIA_LABELS[item.type] ?? "Xabar";
  return item.text ?? "🔒 Xabarni ochib bo'lmadi";
}

export function ScheduledMessagesScreen({ route }: Props) {
  const { conversationId } = route.params;
  const messages = useChatStore((s) => s.scheduledMessagesByConversation[conversationId] ?? []);
  const loadScheduledMessages = useChatStore((s) => s.loadScheduledMessages);
  const cancelScheduledMessage = useChatStore((s) => s.cancelScheduledMessage);
  const rescheduleMessage = useChatStore((s) => s.rescheduleMessage);
  const sendScheduledMessageNow = useChatStore((s) => s.sendScheduledMessageNow);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    setError(false);
    setLoading(true);
    loadScheduledMessages(conversationId)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [conversationId, loadScheduledMessages]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadScheduledMessages(conversationId).catch(() => {}).finally(() => setRefreshing(false));
  }, [conversationId, loadScheduledMessages]);

  useFocusEffect(
    useCallback(() => { load(); }, [load])
  );

  const onCancel = (item: DecryptedMessage) => {
    Alert.alert("Bekor qilish", "Rejalashtirilgan xabarni bekor qilasizmi?", [
      { text: "Yo'q", style: "cancel" },
      {
        text: "Ha, bekor qilish",
        style: "destructive",
        onPress: () => cancelScheduledMessage(conversationId, item.id).catch(() => {}),
      },
    ]);
  };

  const onSendNow = (item: DecryptedMessage) => {
    Alert.alert("Hozir yuborish", "Xabar hoziroq yuborilsinmi?", [
      { text: "Yo'q", style: "cancel" },
      {
        text: "Ha, yuborish",
        onPress: () =>
          sendScheduledMessageNow(conversationId, item.id).catch(() =>
            Alert.alert("Xatolik", "Xabarni yuborib bo'lmadi")
          ),
      },
    ]);
  };

  const onReschedule = (item: DecryptedMessage) => {
    Alert.alert("Vaqtni o'zgartirish", undefined, [
      ...SCHEDULE_OPTIONS.map((opt) => ({
        text: opt.label,
        onPress: () =>
          rescheduleMessage(conversationId, item.id, opt.getDate().toISOString()).catch(() =>
            Alert.alert("Xatolik", "Vaqtni o'zgartirib bo'lmadi")
          ),
      })),
      { text: "Bekor qilish", style: "cancel" as const },
    ]);
  };

  const onItemActions = (item: DecryptedMessage) => {
    Alert.alert("Rejalashtirilgan xabar", undefined, [
      { text: "🚀 Hozir yuborish", onPress: () => onSendNow(item) },
      ...(item.sendWhenOnline ? [] : [{ text: "🕒 Vaqtni o'zgartirish", onPress: () => onReschedule(item) }]),
      { text: "🗑 Bekor qilish", style: "destructive", onPress: () => onCancel(item) },
      { text: "Yopish", style: "cancel" },
    ]);
  };

  const renderItem = ({ item }: { item: DecryptedMessage }) => (
    <TouchableOpacity style={styles.row} onLongPress={() => onItemActions(item)}>
      <View style={styles.content}>
        <Text style={styles.preview} numberOfLines={3}>
          {getPreview(item)}
        </Text>
        <Text style={styles.time}>
          {item.sendWhenOnline ? "🟢 Onlayn bo'lganda yuboriladi" : `🕒 ${formatScheduledTime(item.scheduledFor!)}`}
        </Text>
      </View>
      <TouchableOpacity style={styles.menuButton} onPress={() => onItemActions(item)} hitSlop={8}>
        <Text style={styles.menuButtonText}>•••</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorView message="Rejalashtirilgan xabarlarni yuklab bo'lmadi" onRetry={load} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>🕒 Rejalashtirilgan xabarlar yo'q</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  content: { flex: 1 },
  preview: { fontSize: 15, color: colors.text },
  time: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  menuButton: { paddingHorizontal: 12, paddingVertical: 6 },
  menuButtonText: { color: colors.textSecondary, fontWeight: "700", fontSize: 16 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 12 },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
});
