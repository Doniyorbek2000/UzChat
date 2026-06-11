import { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { Conversation } from "../../types";
import { getConversationDisplay } from "../../utils/conversation";

type Props = NativeStackScreenProps<RootStackParamList, "ForwardMessage">;

export function ForwardMessageScreen({ route, navigation }: Props) {
  const { conversationId, messageId } = route.params;
  const conversations = useChatStore((s) => s.conversations);
  const forwardMessage = useChatStore((s) => s.forwardMessage);
  const user = useAuthStore((s) => s.user);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const toggleSelect = (target: Conversation) => {
    if (sending) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(target.id)) next.delete(target.id);
      else next.add(target.id);
      return next;
    });
  };

  const onSend = async () => {
    if (sending || selectedIds.size === 0) return;
    setSending(true);
    try {
      for (const targetId of selectedIds) {
        await forwardMessage(conversationId, messageId, targetId);
      }
      navigation.goBack();
    } catch {
      Alert.alert("Xatolik", "Xabarni yo'naltirib bo'lmadi");
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const display = getConversationDisplay(item, user!.id);
    const selected = selectedIds.has(item.id);
    return (
      <TouchableOpacity style={styles.row} onPress={() => toggleSelect(item)} disabled={sending}>
        <Avatar uri={display.avatarUrl} name={display.title} />
        <Text style={styles.title} numberOfLines={1}>
          {display.title}
        </Text>
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected && <Text style={styles.checkboxIcon}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Suhbatlar yo'q</Text>
          </View>
        }
      />
      {selectedIds.size > 0 && (
        <TouchableOpacity style={styles.sendButton} onPress={onSend} disabled={sending}>
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Yuborish ({selectedIds.size})</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  title: { fontSize: 16, color: colors.text, flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxIcon: { color: "#fff", fontSize: 14, fontWeight: "700" },
  sendButton: {
    margin: 12,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  sendButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
