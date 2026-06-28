import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { contactsApi } from "../../api/contacts";
import { broadcastsApi } from "../../api/broadcasts";
import { useChatStore } from "../../store/chatStore";
import { colors } from "../../theme/colors";
import { BroadcastList, Contact } from "../../types";

type Props = NativeStackScreenProps<RootStackParamList, "BroadcastLists">;

export function BroadcastListsScreen({ navigation }: Props) {
  const [lists, setLists] = useState<BroadcastList[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendTarget, setSendTarget] = useState<BroadcastList | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const createDirectConversation = useChatStore((s) => s.createDirectConversation);
  const sendTextMessage = useChatStore((s) => s.sendTextMessage);

  const load = useCallback(() => {
    Promise.all([broadcastsApi.list(), contactsApi.list()])
      .then(([broadcastLists, contactList]) => {
        setLists(broadcastLists);
        setContacts(contactList);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onDelete = (list: BroadcastList) => {
    Alert.alert("Ro'yxatni o'chirish", `"${list.name}" ro'yxatini o'chirmoqchimisiz?`, [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: () => {
          broadcastsApi
            .remove(list.id)
            .then(() => setLists((prev) => prev.filter((l) => l.id !== list.id)))
            .catch(() => {});
        },
      },
    ]);
  };

  const onLongPress = (list: BroadcastList) => {
    Alert.alert(list.name, undefined, [
      { text: "Tahrirlash", onPress: () => navigation.navigate("EditBroadcastList", { list }) },
      { text: "O'chirish", style: "destructive", onPress: () => onDelete(list) },
      { text: "Bekor qilish", style: "cancel" },
    ]);
  };

  const onSend = async () => {
    if (!sendTarget) return;
    const text = message.trim();
    if (!text) return;

    setSending(true);
    try {
      let delivered = 0;
      let failed = 0;
      for (const memberId of sendTarget.memberIds) {
        const contact = contacts.find((c) => c.user.id === memberId);
        if (!contact) continue;
        try {
          const conversation = await createDirectConversation(contact.user);
          await sendTextMessage(conversation.id, text);
          delivered++;
        } catch {
          failed++;
        }
      }
      setSendTarget(null);
      setMessage("");
      Alert.alert(
        "Yuborildi",
        failed > 0 ? `Xabar ${delivered} kishiga yuborildi, ${failed} kishiga yuborilmadi` : `Xabar ${delivered} kishiga yuborildi`
      );
    } finally {
      setSending(false);
    }
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
        data={lists}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => setSendTarget(item)}
            onLongPress={() => onLongPress(item)}
          >
            <View style={styles.icon}>
              <Text style={styles.iconText}>📢</Text>
            </View>
            <View style={styles.rowText}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.memberCount}>{item.memberIds.length} a'zo</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Hali tarqatish ro'yxatlari yo'q</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.addRow} onPress={() => navigation.navigate("EditBroadcastList", {})}>
            <View style={[styles.icon, styles.addIcon]}>
              <Text style={styles.iconText}>➕</Text>
            </View>
            <Text style={styles.addText}>Yangi ro'yxat yaratish</Text>
          </TouchableOpacity>
        }
      />

      <Modal visible={!!sendTarget} transparent animationType="fade" onRequestClose={() => setSendTarget(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{sendTarget?.name}</Text>
            <Text style={styles.modalSubtitle}>
              Xabar har bir a'zoga alohida shaxsiy xabar sifatida yuboriladi
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Xabar matni"
              placeholderTextColor={colors.textSecondary}
              value={message}
              onChangeText={setMessage}
              multiline
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  setSendTarget(null);
                  setMessage("");
                }}
                disabled={sending}
              >
                <Text style={styles.modalCancelText}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSend} onPress={onSend} disabled={sending}>
                {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSendText}>Yuborish</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 48 },
  row: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addIcon: { backgroundColor: colors.background },
  iconText: { fontSize: 18 },
  rowText: { flex: 1 },
  name: { fontSize: 16, fontWeight: "500", color: colors.text },
  memberCount: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 12 },
  empty: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textSecondary },
  addRow: { flexDirection: "row", alignItems: "center", padding: 12, gap: 12 },
  addText: { fontSize: 16, fontWeight: "500", color: colors.text },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    gap: 10,
  },
  modalTitle: { fontSize: 17, fontWeight: "700", color: colors.text },
  modalSubtitle: { fontSize: 13, color: colors.textSecondary },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    maxHeight: 120,
    minHeight: 44,
  },
  modalActions: { flexDirection: "row", gap: 8 },
  modalCancel: { flex: 1, paddingVertical: 14, alignItems: "center" },
  modalCancelText: { color: colors.textSecondary, fontSize: 15, fontWeight: "600" },
  modalSend: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  modalSendText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
