import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore, DecryptedMessage } from "../../store/chatStore";
import { colors } from "../../theme/colors";
import { MessageType } from "../../types";
import { formatScheduledTime } from "../../utils/scheduledMessages";

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
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadScheduledMessages(conversationId)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [conversationId, loadScheduledMessages])
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

  const renderItem = ({ item }: { item: DecryptedMessage }) => (
    <TouchableOpacity style={styles.row} onLongPress={() => onCancel(item)}>
      <View style={styles.content}>
        <Text style={styles.preview} numberOfLines={3}>
          {getPreview(item)}
        </Text>
        <Text style={styles.time}>🕒 {formatScheduledTime(item.scheduledFor!)}</Text>
      </View>
      <TouchableOpacity style={styles.cancelButton} onPress={() => onCancel(item)} hitSlop={8}>
        <Text style={styles.cancelText}>Bekor qilish</Text>
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

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
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
  cancelButton: { paddingHorizontal: 12, paddingVertical: 6 },
  cancelText: { color: colors.danger, fontWeight: "600", fontSize: 13 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 12 },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
});
