import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useChatStore } from "../../store/chatStore";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../../components/Avatar";
import { colors } from "../../theme/colors";
import { broadcastsApi } from "../../api/broadcasts";
import { contactsApi } from "../../api/contacts";
import { BroadcastList, Contact, Conversation } from "../../types";
import { getConversationDisplay } from "../../utils/conversation";

type Props = NativeStackScreenProps<RootStackParamList, "ForwardMessage">;

export function ForwardMessageScreen({ route, navigation }: Props) {
  const { conversationId, messageIds } = route.params;
  const conversations = useChatStore((s) => s.conversations);
  const contactAliases = useChatStore((s) => s.contactAliases);
  const forwardMessage = useChatStore((s) => s.forwardMessage);
  const sendTextMessage = useChatStore((s) => s.sendTextMessage);
  const createDirectConversation = useChatStore((s) => s.createDirectConversation);
  const user = useAuthStore((s) => s.user);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedBroadcastIds, setSelectedBroadcastIds] = useState<Set<string>>(new Set());
  const [broadcastLists, setBroadcastLists] = useState<BroadcastList[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [comment, setComment] = useState("");
  const [hideSender, setHideSender] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    broadcastsApi
      .list()
      .then(setBroadcastLists)
      .catch(() => {});
    contactsApi
      .list()
      .then(setContacts)
      .catch(() => {});
  }, []);

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return conversations;
    return conversations.filter((item) => {
      const display = getConversationDisplay(item, user!.id, contactAliases);
      return display.title.toLowerCase().includes(query);
    });
  }, [conversations, contactAliases, user, search]);

  const filteredBroadcastLists = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return broadcastLists;
    return broadcastLists.filter((item) => item.name.toLowerCase().includes(query));
  }, [broadcastLists, search]);

  const toggleSelect = (target: Conversation) => {
    if (sending) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(target.id)) next.delete(target.id);
      else next.add(target.id);
      return next;
    });
  };

  const toggleBroadcastSelect = (list: BroadcastList) => {
    if (sending) return;
    setSelectedBroadcastIds((prev) => {
      const next = new Set(prev);
      if (next.has(list.id)) next.delete(list.id);
      else next.add(list.id);
      return next;
    });
  };

  const totalSelected = selectedIds.size + selectedBroadcastIds.size;

  const onSend = async () => {
    if (sending || totalSelected === 0) return;
    setSending(true);
    const trimmedComment = comment.trim();
    try {
      for (const targetId of selectedIds) {
        for (const messageId of messageIds) {
          await forwardMessage(conversationId, messageId, targetId, hideSender);
        }
        if (trimmedComment) {
          await sendTextMessage(targetId, trimmedComment);
        }
      }
      for (const listId of selectedBroadcastIds) {
        const list = broadcastLists.find((l) => l.id === listId);
        if (!list) continue;
        for (const memberId of list.memberIds) {
          const contact = contacts.find((c) => c.user.id === memberId);
          if (!contact) continue;
          const targetConversation = await createDirectConversation(contact.user);
          for (const messageId of messageIds) {
            await forwardMessage(conversationId, messageId, targetConversation.id, hideSender);
          }
          if (trimmedComment) {
            await sendTextMessage(targetConversation.id, trimmedComment);
          }
        }
      }
      navigation.goBack();
    } catch {
      Alert.alert("Xatolik", "Xabarni yo'naltirib bo'lmadi");
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const display = getConversationDisplay(item, user!.id, contactAliases);
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

  const renderBroadcastItem = (item: BroadcastList) => {
    const selected = selectedBroadcastIds.has(item.id);
    return (
      <TouchableOpacity key={item.id} style={styles.row} onPress={() => toggleBroadcastSelect(item)} disabled={sending}>
        <View style={styles.broadcastIcon}>
          <Text style={styles.broadcastIconText}>📢</Text>
        </View>
        <Text style={styles.title} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected && <Text style={styles.checkboxIcon}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {conversations.length > 0 && (
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Qidirish"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={8}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          filteredBroadcastLists.length > 0 ? (
            <View>
              <Text style={styles.sectionHeader}>Tarqatish ro'yxatlari</Text>
              {filteredBroadcastLists.map(renderBroadcastItem)}
              <Text style={styles.sectionHeader}>Suhbatlar</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          filteredBroadcastLists.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{conversations.length === 0 ? "Suhbatlar yo'q" : "Hech narsa topilmadi"}</Text>
            </View>
          ) : null
        }
      />
      {totalSelected > 0 && (
        <View style={styles.footer}>
          <View style={styles.hideSenderRow}>
            <Text style={styles.hideSenderText}>Muallifni yashirish</Text>
            <Switch value={hideSender} onValueChange={setHideSender} disabled={sending} />
          </View>
          <TextInput
            style={styles.commentInput}
            placeholder="Izoh qo'shish (ixtiyoriy)"
            placeholderTextColor={colors.textSecondary}
            value={comment}
            onChangeText={setComment}
            multiline
            editable={!sending}
          />
          <TouchableOpacity style={styles.sendButton} onPress={onSend} disabled={sending}>
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>Yuborish ({totalSelected})</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  title: { fontSize: 16, color: colors.text, flex: 1 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 72 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  broadcastIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  broadcastIconText: { fontSize: 20 },
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
  footer: { padding: 12, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  hideSenderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  hideSenderText: { fontSize: 14, color: colors.text },
  commentInput: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  sendButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
