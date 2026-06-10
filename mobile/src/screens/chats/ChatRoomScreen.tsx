import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore, DecryptedMessage } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "ChatRoom">;

export function ChatRoomScreen({ route, navigation }: Props) {
  const { conversationId, title } = route.params;
  const user = useAuthStore((s) => s.user);
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === conversationId));
  const messages = useChatStore((s) => s.messagesByConversation[conversationId] ?? []);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const sendTextMessage = useChatStore((s) => s.sendTextMessage);
  const markRead = useChatStore((s) => s.markRead);
  const setTyping = useChatStore((s) => s.setTyping);
  const typingUsers = useChatStore((s) => s.typingUsers[conversationId]);

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const listRef = useRef<FlatList<DecryptedMessage>>(null);

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  useEffect(() => {
    loadMessages(conversationId)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [conversationId, loadMessages]);

  useEffect(() => {
    markRead(conversationId).catch(() => {});
  }, [conversationId, markRead, messages.length]);

  const onSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    setTyping(conversationId, false);
    try {
      await sendTextMessage(conversationId, trimmed);
      listRef.current?.scrollToEnd({ animated: true });
    } catch {
      setText(trimmed);
    }
  };

  const onChangeText = (value: string) => {
    setText(value);
    setTyping(conversationId, value.length > 0);
  };

  const isGroup = conversation?.type === "GROUP";

  const renderItem = ({ item }: { item: DecryptedMessage }) => {
    const isOwn = item.senderId === user?.id;
    const sender = conversation?.participants.find((p) => p.userId === item.senderId)?.user;

    return (
      <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowSelf : styles.bubbleRowOther]}>
        <View style={[styles.bubble, isOwn ? styles.bubbleSelf : styles.bubbleOther]}>
          {isGroup && !isOwn && sender && <Text style={styles.senderName}>{sender.displayName}</Text>}
          <Text style={styles.messageText}>{item.decryptFailed ? "🔒 Xabarni ochib bo'lmadi" : item.text}</Text>
          <Text style={styles.messageTime}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    );
  };

  const typingCount = typingUsers?.size ?? 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>🔒 Xabarlar end-to-end shifrlangan</Text>
            </View>
          ) : null
        }
      />
      {typingCount > 0 && <Text style={styles.typing}>yozmoqda...</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={onChangeText}
          placeholder="Xabar yozing..."
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={onSend} disabled={!text.trim()}>
          <Text style={styles.sendText}>Yuborish</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 12, flexGrow: 1 },
  bubbleRow: { flexDirection: "row", marginVertical: 4 },
  bubbleRowSelf: { justifyContent: "flex-end" },
  bubbleRowOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleSelf: { backgroundColor: colors.bubbleSelf, borderTopRightRadius: 2 },
  bubbleOther: { backgroundColor: colors.bubbleOther, borderTopLeftRadius: 2 },
  senderName: { fontSize: 12, fontWeight: "600", color: colors.primaryDark, marginBottom: 2 },
  messageText: { fontSize: 16, color: colors.text },
  messageTime: { fontSize: 10, color: colors.textSecondary, alignSelf: "flex-end", marginTop: 4 },
  typing: { paddingHorizontal: 16, paddingBottom: 4, color: colors.textSecondary, fontSize: 12 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
    fontSize: 16,
  },
  sendButton: { backgroundColor: colors.primary, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  sendText: { color: "#fff", fontWeight: "600" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  emptyText: { color: colors.textSecondary },
});
